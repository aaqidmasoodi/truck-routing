"""Driving routes from an OSRM server (https://project-osrm.org).

Route data comes from OpenStreetMap, (c) OpenStreetMap contributors.
"""

from dataclasses import dataclass
from typing import Any

import httpx
from django.conf import settings

from ..polyline import Point, decode
from .http import new_client

METERS_PER_MILE = 1609.344


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
    """Up to three driving routes. OSRM only adds alternatives when it finds sensible ones."""
    if client is not None:
        return _fetch(client, origin, destination)
    with new_client() as http:
        return _fetch(http, origin, destination)


def _fetch(http: httpx.Client, origin: Point, destination: Point) -> list[Route]:
    # OSRM wants longitude first.
    coordinates = ";".join(f"{lon},{lat}" for lat, lon in (origin, destination))
    try:
        response = http.get(
            f"{settings.ROUTING_URL}/{coordinates}",
            params={
                "alternatives": 3,
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
        raise RoutingError(f"Routing request failed: {error}") from error
    except (ValueError, KeyError, TypeError) as error:
        raise RoutingError(f"Unexpected routing response: {error}") from error

    if not routes:
        raise NoRouteFound("No route between these places")
    return routes
