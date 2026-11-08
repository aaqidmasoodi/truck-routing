"""Valhalla as the last resort when every OSRM server has failed."""

import json
from typing import Any

import httpx
import pytest
from django.core.cache import cache

from routing.clients.routing import NoRouteFound, RoutingError, find_routes

DENVER, CHICAGO = (39.74, -104.98), (41.88, -87.63)
OSRM = "https://osrm.example/route/v1/driving"
VALHALLA = "https://valhalla.example"

# "_izlhA~rlgdF_qo]~po]" is (38.5, -120.2) then (39.0, -120.7) at precision 6.
SHAPE = "_izlhA~rlgdF_qo]~po]"


def trip(miles: float, seconds: float) -> dict[str, Any]:
    return {"summary": {"length": miles, "time": seconds}, "legs": [{"shape": SHAPE}]}


@pytest.fixture(autouse=True)
def servers(settings: Any) -> None:
    cache.clear()
    settings.ROUTING_URLS = [OSRM]
    settings.VALHALLA_URL = VALHALLA


def plan(handler: Any) -> list[Any]:
    return find_routes(DENVER, CHICAGO, client=httpx.Client(transport=httpx.MockTransport(handler)))


def valhalla_query(request: httpx.Request) -> dict[str, Any]:
    query: dict[str, Any] = json.loads(request.url.params["json"])
    return query


def test_falls_back_to_valhalla_when_osrm_is_down() -> None:
    hosts: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        hosts.append(request.url.host)
        if request.url.host == "osrm.example":
            return httpx.Response(503)
        return httpx.Response(200, json={"trip": trip(197.5, 11263)})

    routes = plan(handler)

    assert hosts[:2] == ["osrm.example", "valhalla.example"]
    assert routes[0].distance_miles == pytest.approx(197.5)
    assert routes[0].duration_minutes == pytest.approx(11263 / 60)
    assert routes[0].points == [(38.5, -120.2), (39.0, -120.7)]


def test_asks_valhalla_for_a_truck_route_with_alternates_in_miles() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "osrm.example":
            return httpx.Response(503)
        seen.append(request)
        return httpx.Response(200, json={"trip": trip(100, 3600)})

    plan(handler)

    first = valhalla_query(seen[0])
    assert seen[0].url.path == "/route"
    # Spaces would reach Valhalla as "+", which its JSON reader rejects.
    assert b"+" not in seen[0].url.query
    assert first["costing"] == "truck"
    assert first["units"] == "miles"
    assert first["alternates"] == 2
    assert first["locations"] == [
        {"lat": 39.74, "lon": -104.98},
        {"lat": 41.88, "lon": -87.63},
    ]


def test_valhalla_detours_pass_through_the_middle_point() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "osrm.example":
            return httpx.Response(503)
        seen.append(request)
        return httpx.Response(200, json={"trip": trip(100, 3600)})

    plan(handler)

    detour = valhalla_query(seen[1])
    assert "alternates" not in detour
    assert [location.get("type") for location in detour["locations"]] == [None, "through", None]


def test_reads_valhalla_alternates_as_more_routes() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "osrm.example":
            return httpx.Response(503)
        return httpx.Response(
            200,
            json={"trip": trip(100, 3600), "alternates": [{"trip": trip(120, 4000)}]},
        )

    routes = plan(handler)

    assert [round(route.distance_miles) for route in routes] == [100, 120]


@pytest.mark.parametrize("code", [170, 171, 442, 443])
def test_valhalla_no_route_codes_mean_no_route(code: int) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "osrm.example":
            return httpx.Response(503)
        return httpx.Response(400, json={"error_code": code, "error": "No path"})

    with pytest.raises(NoRouteFound):
        plan(handler)


@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(500, text="oops"),
        httpx.Response(200, json={"no": "trip"}),
        httpx.Response(200, json={"trip": {"summary": {}}}),
    ],
)
def test_valhalla_problems_are_routing_errors(response: httpx.Response) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "osrm.example":
            return httpx.Response(503)
        return response

    with pytest.raises(RoutingError) as caught:
        plan(handler)
    assert not isinstance(caught.value, NoRouteFound)


def test_osrm_is_still_used_first_when_it_works() -> None:
    hosts: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        hosts.append(request.url.host)
        return httpx.Response(
            200,
            json={
                "code": "Ok",
                "routes": [{"distance": 160934.4, "duration": 5400, "geometry": SHAPE}],
            },
        )

    plan(handler)

    assert set(hosts) == {"osrm.example"}


def test_no_route_from_osrm_is_not_retried_on_valhalla() -> None:
    hosts: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        hosts.append(request.url.host)
        return httpx.Response(400, json={"code": "NoRoute"})

    with pytest.raises(NoRouteFound):
        plan(handler)
    assert hosts == ["osrm.example"]


def test_valhalla_can_be_turned_off(settings: Any) -> None:
    settings.VALHALLA_URL = ""
    hosts: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        hosts.append(request.url.host)
        return httpx.Response(503)

    with pytest.raises(RoutingError):
        plan(handler)
    assert set(hosts) == {"osrm.example"}
