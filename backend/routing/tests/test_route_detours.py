"""Topping up OSRM's alternatives to three routes with detours."""

import math
from collections.abc import Sequence
from typing import Any

import httpx
import pytest
from django.core.cache import cache

from routing.clients.routing import (
    TARGET_ROUTES,
    Route,
    _detour_points,
    _trim_spur,
    find_routes,
)
from routing.geo import miles_between
from routing.polyline import Point, decode

DENVER, CHICAGO = (39.74, -104.98), (41.88, -87.63)


@pytest.fixture(autouse=True)
def empty_cache() -> None:
    cache.clear()


def encode(points: Sequence[Point], precision: int = 6) -> str:
    """Google's polyline format, the inverse of `routing.polyline.decode`."""
    factor = 10**precision
    out: list[str] = []
    last_lat = last_lon = 0
    for lat, lon in points:
        ilat, ilon = round(lat * factor), round(lon * factor)
        for delta in (ilat - last_lat, ilon - last_lon):
            value = ~(delta << 1) if delta < 0 else delta << 1
            while value >= 0x20:
                out.append(chr((0x20 | (value & 0x1F)) + 63))
                value >>= 5
            out.append(chr(value + 63))
        last_lat, last_lon = ilat, ilon
    return "".join(out)


def line(*corners: Point, steps: int = 40) -> list[Point]:
    """A path through the corners, with points every so often like a real road."""
    path: list[Point] = []
    for (lat1, lon1), (lat2, lon2) in zip(corners, corners[1:], strict=False):
        for step in range(steps):
            share = step / steps
            path.append((lat1 + (lat2 - lat1) * share, lon1 + (lon2 - lon1) * share))
    path.append(corners[-1])
    return path


def length(points: Sequence[Point]) -> float:
    return sum(miles_between(a, b) for a, b in zip(points, points[1:], strict=False))


def osrm(*routes: tuple[list[Point], float]) -> dict[str, Any]:
    """An OSRM answer with these (points, hours) routes."""
    return {
        "code": "Ok",
        "routes": [
            {
                "distance": length(points) * 1609.344,
                "duration": hours * 3600,
                "geometry": encode(points),
            }
            for points, hours in routes
        ],
    }


def make_route(points: list[Point], hours: float = 1.0) -> Route:
    return Route(id="r", distance_miles=length(points), duration_minutes=hours * 60, points=points)


# The straight route, and two well separated ways round, north and south.
STRAIGHT = line(DENVER, CHICAGO)
NORTH = line(DENVER, (44.5, -96.0), CHICAGO)
SOUTH = line(DENVER, (37.0, -96.0), CHICAGO)


def is_detour(request: httpx.Request) -> bool:
    return request.url.path.count(";") == 2


class Server:
    """Answers the start-to-end lookup with `main`, and each detour from `detours` in turn."""

    def __init__(
        self, main: dict[str, Any], detours: list[dict[str, Any] | httpx.Response]
    ) -> None:
        self.main = main
        self.detours = list(detours)
        self.requests: list[httpx.Request] = []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if not is_detour(request):
            return httpx.Response(200, json=self.main)
        answer = self.detours.pop(0) if self.detours else osrm((STRAIGHT, 18))
        return answer if isinstance(answer, httpx.Response) else httpx.Response(200, json=answer)

    @property
    def detour_requests(self) -> list[httpx.Request]:
        return [request for request in self.requests if is_detour(request)]


def plan(server: Server) -> list[Route]:
    client = httpx.Client(transport=httpx.MockTransport(server))
    return find_routes(DENVER, CHICAGO, client=client)


def test_tops_up_to_three_routes_with_detours() -> None:
    server = Server(osrm((STRAIGHT, 18)), [osrm((NORTH, 21)), osrm((SOUTH, 20))])

    routes = plan(server)

    assert len(routes) == TARGET_ROUTES
    assert [route.id for route in routes] == ["route-1", "route-2", "route-3"]


def test_routes_are_numbered_fastest_first() -> None:
    server = Server(osrm((STRAIGHT, 18)), [osrm((NORTH, 21)), osrm((SOUTH, 20))])

    routes = plan(server)

    assert [route.duration_minutes for route in routes] == [18 * 60, 20 * 60, 21 * 60]


def test_no_detours_when_osrm_already_found_three() -> None:
    server = Server(osrm((STRAIGHT, 18), (NORTH, 21), (SOUTH, 20)), [])

    assert len(plan(server)) == 3
    assert server.detour_requests == []


def test_stops_asking_once_it_has_three() -> None:
    server = Server(osrm((STRAIGHT, 18), (NORTH, 21)), [osrm((SOUTH, 20))])

    plan(server)

    assert len(server.detour_requests) == 1


def test_detours_go_through_one_point_without_alternatives() -> None:
    server = Server(osrm((STRAIGHT, 18)), [osrm((NORTH, 21)), osrm((SOUTH, 20))])

    plan(server)

    assert server.detour_requests
    for request in server.detour_requests:
        assert request.url.params["alternatives"] == "false"


def test_a_detour_much_slower_than_the_fastest_is_dropped() -> None:
    # 18 h is the fastest, so 30 h is more than 1.6 times as long.
    server = Server(osrm((STRAIGHT, 18)), [osrm((NORTH, 30)), osrm((SOUTH, 20))])

    routes = plan(server)

    assert [route.duration_minutes / 60 for route in routes] == [18, 20]


def test_a_detour_that_repeats_a_route_is_dropped() -> None:
    server = Server(osrm((STRAIGHT, 18)), [osrm((STRAIGHT, 18.5)), osrm((SOUTH, 20))])

    routes = plan(server)

    assert [route.duration_minutes / 60 for route in routes] == [18, 20]


def test_a_failed_detour_is_skipped() -> None:
    server = Server(
        osrm((STRAIGHT, 18)),
        [httpx.Response(503), osrm((NORTH, 21)), osrm((SOUTH, 20))],
    )

    assert len(plan(server)) == 3


def test_a_detour_with_no_road_is_skipped() -> None:
    server = Server(
        osrm((STRAIGHT, 18)),
        [httpx.Response(400, json={"code": "NoRoute"}), osrm((NORTH, 21)), osrm((SOUTH, 20))],
    )

    assert len(plan(server)) == 3


def test_settles_for_fewer_when_no_detour_is_any_good() -> None:
    server = Server(osrm((STRAIGHT, 18)), [])

    routes = plan(server)

    assert len(routes) == 1
    assert len(server.detour_requests) == 4


def test_detours_are_cached_with_the_trip() -> None:
    server = Server(osrm((STRAIGHT, 18)), [osrm((NORTH, 21)), osrm((SOUTH, 20))])
    plan(server)
    asked = len(server.requests)

    assert len(plan(server)) == 3
    assert len(server.requests) == asked


# Where the detour points go.


def test_detour_points_sit_either_side_of_the_midpoint() -> None:
    left, right, far_left, far_right = _detour_points((0.0, 0.0), (0.0, 10.0))

    # Due east: the sides are north and south, at the halfway longitude.
    assert left == pytest.approx((1.5, 5.0))
    assert right == pytest.approx((-1.5, 5.0))
    assert far_left == pytest.approx((3.0, 5.0))
    assert far_right == pytest.approx((-3.0, 5.0))


def test_detour_points_are_square_to_the_trip() -> None:
    squash = math.cos(math.radians((DENVER[0] + CHICAGO[0]) / 2))
    trip = (CHICAGO[0] - DENVER[0], (CHICAGO[1] - DENVER[1]) * squash)
    mid = ((DENVER[0] + CHICAGO[0]) / 2, (DENVER[1] + CHICAGO[1]) / 2)

    for lat, lon in _detour_points(DENVER, CHICAGO):
        side = (lat - mid[0], (lon - mid[1]) * squash)
        assert trip[0] * side[0] + trip[1] * side[1] == pytest.approx(0, abs=1e-3)


def test_nearer_detours_come_first() -> None:
    mid = ((DENVER[0] + CHICAGO[0]) / 2, (DENVER[1] + CHICAGO[1]) / 2)
    distances = [miles_between(mid, point) for point in _detour_points(DENVER, CHICAGO)]

    assert distances[0] == pytest.approx(distances[1], rel=0.05)
    assert distances[1] < distances[2]


# Comparing routes.


def test_a_route_fully_overlaps_itself() -> None:
    route = make_route(STRAIGHT)

    assert route.overlap(route) == 1


def test_routes_far_apart_hardly_overlap() -> None:
    assert make_route(NORTH).overlap(make_route(SOUTH)) < 0.2


def test_a_straight_road_does_not_double_back() -> None:
    assert not make_route(STRAIGHT).doubles_back()


def test_a_road_along_a_grid_line_does_not_count_as_doubling_back() -> None:
    # Wobbling a few metres either side of latitude 40.0, the edge of two grid squares.
    wobble = [(40.0 + (0.001 if i % 2 else -0.001), -100 + i * 0.01) for i in range(400)]

    assert not make_route(wobble).doubles_back()


def test_out_and_back_doubles_back() -> None:
    out = line((40.0, -100.0), (41.0, -100.0))
    there_and_back = out + out[::-1] + line((40.0, -100.0), (40.0, -99.0))[1:]

    assert make_route(there_and_back).doubles_back()


# Trimming the side trip out to a detour point.


def with_spur(main: list[Point], tip: Point, back: list[Point] | None = None) -> list[Point]:
    middle = len(main) // 2
    out = line(main[middle], tip)
    back = back if back is not None else out[::-1]
    return main[: middle + 1] + out[1:] + back[1:-1] + main[middle:]


def test_trims_a_side_trip_to_the_detour_point() -> None:
    main = line((40.0, -100.0), (40.0, -98.0))
    route = make_route(with_spur(main, (40.5, -99.0)), hours=4)

    trimmed = _trim_spur(route, (40.5, -99.0))

    assert trimmed.distance_miles == pytest.approx(length(main), rel=0.01)
    assert trimmed.duration_minutes < route.duration_minutes
    assert not trimmed.doubles_back()


def test_trimming_takes_off_time_in_proportion() -> None:
    main = line((40.0, -100.0), (40.0, -98.0))
    route = make_route(with_spur(main, (40.5, -99.0)), hours=4)

    trimmed = _trim_spur(route, (40.5, -99.0))

    share = trimmed.distance_miles / route.distance_miles
    assert trimmed.duration_minutes == pytest.approx(route.duration_minutes * share)


def test_trims_a_side_trip_on_a_divided_road() -> None:
    main = line((40.0, -100.0), (40.0, -98.0))
    middle = main[len(main) // 2]
    # Out on one carriageway and back on the other, 40 m over, each with its own point
    # spacing (a few dozen metres, like OSRM's full geometry).
    out = line(middle, (40.5, -99.0), steps=1200)
    back = [(lat, lon + 0.0005) for lat, lon in line((40.5, -99.0), middle, steps=900)]
    points = main[: len(main) // 2 + 1] + out[1:] + back[1:-1] + main[len(main) // 2 :]
    route = make_route(points, hours=4)

    trimmed = _trim_spur(route, (40.5, -99.0))

    assert trimmed.distance_miles == pytest.approx(length(main), rel=0.05)
    assert not trimmed.doubles_back()


def test_a_route_that_just_passes_the_detour_point_is_left_alone() -> None:
    route = make_route(NORTH, hours=21)

    assert _trim_spur(route, (44.5, -96.0)) == route


def test_tiny_routes_are_left_alone() -> None:
    route = make_route([(40.0, -100.0), (40.0, -99.0)])

    assert _trim_spur(route, (41.0, -99.5)) == route


def test_encode_matches_decode() -> None:
    decoded = decode(encode(NORTH), precision=6)

    assert len(decoded) == len(NORTH)
    for got, want in zip(decoded, NORTH, strict=True):
        assert got == pytest.approx(want, abs=1e-6)
