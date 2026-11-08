"""Driving routes from an OSRM server (https://project-osrm.org).

Route data comes from OpenStreetMap, (c) OpenStreetMap contributors.
"""

import logging
import math
from dataclasses import dataclass, replace
from typing import Any

import httpx
from django.conf import settings
from django.core.cache import cache

from ..geo import miles_between
from ..polyline import Point, decode
from .http import new_client

logger = logging.getLogger(__name__)

METERS_PER_MILE = 1609.344
CACHE_SECONDS = 60 * 60

# The brief asks for three route options.
TARGET_ROUTES = 3
# Where to put detour points, as a share of the trip's straight-line length, off to the
# left (+) or right (-) of its midpoint. Nearer ones first, so detours stay modest.
DETOUR_OFFSETS = (0.15, -0.15, 0.3, -0.3)
# A detour that takes more than this many times as long as the fastest route isn't a
# real option for a driver.
MAX_SLOWDOWN = 1.6
# Share of a detour's road that can be shared with another route before it's a repeat.
MAX_OVERLAP = 0.8
# Grid used to compare routes: 0.05 degrees is about 3-4 miles.
CELLS_PER_DEGREE = 20
# Share of a route's grid cells it can come back to before it counts as doubling back.
MAX_REVISITS = 0.05
# Two road points this close (about 100 m) are the same road driven in both directions,
# allowing for the two sides of a divided highway.
SAME_PLACE_MILES = 0.06
# A road running along a grid line hops between two squares; only coming back to a square
# after this many others counts as driving back over the same road.
MIN_RETURN_GAP = 4


class RoutingError(Exception):
    """The routing service couldn't be reached or sent back something we can't use."""


class NoRouteFound(RoutingError):
    """The service works, but there's no road between the two places (an ocean, say)."""


@dataclass(frozen=True)
class Route:
    id: str
    distance_miles: float
    duration_minutes: float
    points: list[Point]

    def cells(self) -> list[tuple[int, int]]:
        """The grid squares the route passes through, in order, without repeats in a row."""
        path: list[tuple[int, int]] = []
        for lat, lon in self.points:
            cell = (math.floor(lat * CELLS_PER_DEGREE), math.floor(lon * CELLS_PER_DEGREE))
            if not path or path[-1] != cell:
                path.append(cell)
        return path

    def overlap(self, other: "Route") -> float:
        """Share of this route's grid squares that `other` also passes through."""
        mine = set(self.cells())
        if not mine:
            return 1.0
        return len(mine & set(other.cells())) / len(mine)

    def doubles_back(self) -> bool:
        """True when the route drives out and comes back the same way, like a spur."""
        path = self.cells()
        last_seen: dict[tuple[int, int], int] = {}
        revisits = 0
        for index, cell in enumerate(path):
            if cell in last_seen and index - last_seen[cell] >= MIN_RETURN_GAP:
                revisits += 1
            last_seen[cell] = index
        return revisits > MAX_REVISITS * max(len(last_seen), 1)


def parse_routes(payload: dict[str, Any]) -> list[Route]:
    return [
        Route(
            id=f"route-{number}",
            distance_miles=item["distance"] / METERS_PER_MILE,
            duration_minutes=item["duration"] / 60,
            points=decode(item["geometry"], precision=6),
        )
        for number, item in enumerate(payload["routes"], start=1)
    ]


def find_routes(
    origin: Point, destination: Point, client: httpx.Client | None = None
) -> list[Route]:
    """Three driving routes where the roads allow it, fastest first.

    OSRM's own alternatives come first. It often finds only one or two, so the rest are
    made by sending the truck through a point off to one side of the straight line (see
    `_add_detours`). A trip with genuinely one sensible road can still end up with fewer.
    """
    # About 10 m of rounding, so picking the same city twice reuses the result.
    key = "routes:" + ";".join(f"{lat:.4f},{lon:.4f}" for lat, lon in (origin, destination))
    cached: list[Route] | None = cache.get(key)
    if cached is not None:
        logger.debug("route cache hit for %s", key)
        return cached

    if client is not None:
        routes = _try_each_server(client, origin, destination)
    else:
        with new_client() as http:
            routes = _try_each_server(http, origin, destination)

    cache.set(key, routes, CACHE_SECONDS)
    return routes


def _try_each_server(http: httpx.Client, origin: Point, destination: Point) -> list[Route]:
    last_error = RoutingError("No routing servers configured")
    for base_url in settings.ROUTING_URLS:
        try:
            routes = _fetch(http, base_url.strip(), [origin, destination])
        except NoRouteFound:
            raise
        except RoutingError as error:
            logger.warning("routing server %s failed, trying the next one", base_url)
            last_error = error
            continue
        return _add_detours(http, base_url.strip(), origin, destination, routes)
    raise last_error


def _add_detours(
    http: httpx.Client, base_url: str, origin: Point, destination: Point, routes: list[Route]
) -> list[Route]:
    """Top up to three routes by going through points either side of the straight line.

    A detour is kept only if it's a real choice: mostly on different roads from the routes
    already found, not much slower than the fastest, and not driving out to the detour
    point and back on the same road.
    """
    fastest = min(route.duration_minutes for route in routes)
    for via in _detour_points(origin, destination):
        if len(routes) >= TARGET_ROUTES:
            break
        try:
            found = _fetch(http, base_url, [origin, via, destination])
        except RoutingError as error:
            logger.debug("detour through %s failed: %s", via, error)
            continue
        candidate = _trim_spur(found[0], via)
        if candidate.duration_minutes > fastest * MAX_SLOWDOWN:
            logger.debug("detour through %s is too slow", via)
        elif candidate.doubles_back():
            logger.debug("detour through %s drives out and back", via)
        elif any(candidate.overlap(route) > MAX_OVERLAP for route in routes):
            logger.debug("detour through %s repeats a route already found", via)
        else:
            routes.append(candidate)
    # Numbered fastest first, so the ids read the same however each route was found.
    routes.sort(key=lambda route: route.duration_minutes)
    return [replace(route, id=f"route-{number}") for number, route in enumerate(routes, 1)]


def _trim_spur(route: Route, via: Point) -> Route:
    """Cut off a side trip out to the detour point and back along the same road.

    OSRM has to touch the detour point, and if that lands beside a minor road it drives up
    to it and straight back. Both ways pass the same road points, so the side trip shows
    up as a mirror image around the point nearest the detour. That stretch is removed,
    with its miles and, at the route's average speed, its minutes.
    """
    points = route.points
    if len(points) < 3:
        return route
    tip = min(range(len(points)), key=lambda index: miles_between(points[index], via))
    left, right = tip, tip
    # Walk away from the tip on both sides while they stay on the same road. The two
    # directions of a divided road don't have matching points, so each side can step on
    # its own.
    while left > 0 and right < len(points) - 1:
        if miles_between(points[left - 1], points[right + 1]) < SAME_PLACE_MILES:
            left, right = left - 1, right + 1
        elif miles_between(points[left - 1], points[right]) < SAME_PLACE_MILES:
            left -= 1
        elif miles_between(points[left], points[right + 1]) < SAME_PLACE_MILES:
            right += 1
        else:
            break
    if left == right:
        return route
    spur = sum(miles_between(points[i], points[i + 1]) for i in range(left, right))
    share = spur / route.distance_miles if route.distance_miles else 0
    logger.debug("trimmed a %.1f mi side trip from a detour", spur)
    return replace(
        route,
        points=points[: left + 1] + points[right + 1 :],
        distance_miles=route.distance_miles - spur,
        duration_minutes=route.duration_minutes * (1 - share),
    )


def _detour_points(origin: Point, destination: Point) -> list[Point]:
    """Points beside the trip's midpoint, alternating sides, nearest first."""
    mid_lat = (origin[0] + destination[0]) / 2
    mid_lon = (origin[1] + destination[1]) / 2
    # Work in a flat frame where a degree of longitude is as long as a degree of latitude.
    squash = math.cos(math.radians(mid_lat))
    north = destination[0] - origin[0]
    east = (destination[1] - origin[1]) * squash
    # Turned 90 degrees anticlockwise, the trip's direction points off to its left.
    side_north, side_east = east, -north
    points = []
    for offset in DETOUR_OFFSETS:
        lat = mid_lat + side_north * offset
        lon = mid_lon + side_east * offset / squash
        points.append((round(lat, 5), round(lon, 5)))
    return points


def _fetch(http: httpx.Client, base_url: str, waypoints: list[Point]) -> list[Route]:
    # OSRM wants longitude first.
    coordinates = ";".join(f"{lon},{lat}" for lat, lon in waypoints)
    try:
        response = http.get(
            f"{base_url}/{coordinates}",
            params={
                # OSRM only offers alternatives between two points.
                "alternatives": 3 if len(waypoints) == 2 else "false",
                "overview": "full",
                "geometries": "polyline6",
                "steps": "false",
            },
        )
        # OSRM sends errors as HTTP 400 with a code in the body, so read that first.
        payload = response.json() if response.content else {}
        code = payload.get("code") if isinstance(payload, dict) else None
        if code in ("NoRoute", "NoSegment"):
            raise NoRouteFound(payload.get("message", "No route between these places"))
        response.raise_for_status()
        if code != "Ok":
            raise RoutingError(f"Routing service said {code!r}")
        routes = parse_routes(payload)
    except httpx.HTTPError as error:
        logger.warning("routing %s failed: %s", coordinates, error)
        raise RoutingError(f"Routing request failed: {error}") from error
    except (ValueError, KeyError, TypeError) as error:
        logger.warning("routing %s returned an unexpected response: %s", coordinates, error)
        raise RoutingError(f"Unexpected routing response: {error}") from error

    if not routes:
        raise NoRouteFound("No route between these places")
    for route in routes:
        logger.debug(
            "%s: %.1f mi, %.0f min, %d points",
            route.id,
            route.distance_miles,
            route.duration_minutes,
            len(route.points),
        )
    return routes
