from collections.abc import Callable
from typing import Any

import httpx
import pytest
from django.core.cache import cache

from routing.clients.routing import NoRouteFound, RoutingError, find_routes, parse_routes


@pytest.fixture(autouse=True)
def empty_cache() -> None:
    cache.clear()


# Two tiny routes in the shape OSRM returns them (geometries=polyline6).
OSRM_RESPONSE = {
    "code": "Ok",
    "routes": [
        {"distance": 160934.4, "duration": 5400, "geometry": "_izlhA~rlgdF_qo]~po]"},
        {"distance": 177027.84, "duration": 6300, "geometry": "_izlhA~rlgdF"},
    ],
    "waypoints": [],
}


def test_parse_routes_converts_units() -> None:
    first = parse_routes(OSRM_RESPONSE)[0]

    assert first.distance_miles == pytest.approx(100)
    assert first.duration_minutes == 90


def test_parse_routes_decodes_the_shape() -> None:
    assert parse_routes(OSRM_RESPONSE)[0].points == [(38.5, -120.2), (39.0, -120.7)]


def test_routes_get_ids_in_order() -> None:
    assert [route.id for route in parse_routes(OSRM_RESPONSE)] == ["route-1", "route-2"]


def fake_api(handler: Callable[[httpx.Request], httpx.Response]) -> httpx.Client:
    return httpx.Client(transport=httpx.MockTransport(handler))


def test_find_routes_asks_for_alternatives_between_two_points() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json=OSRM_RESPONSE)

    routes = find_routes((39.74, -104.98), (41.88, -87.63), client=fake_api(handler))

    assert len(routes) == 2
    assert seen[0].url.path.endswith("/-104.98,39.74;-87.63,41.88")
    assert seen[0].url.params["alternatives"] == "3"
    assert seen[0].url.params["geometries"] == "polyline6"


def test_find_routes_opens_its_own_client(monkeypatch: pytest.MonkeyPatch) -> None:
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json=OSRM_RESPONSE))
    real_client = httpx.Client
    monkeypatch.setattr(
        httpx, "Client", lambda **kwargs: real_client(transport=transport, **kwargs)
    )

    assert len(find_routes((39.74, -104.98), (41.88, -87.63))) == 2


DENVER, CHICAGO = (39.74, -104.98), (41.88, -87.63)


@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(400, json={"code": "NoRoute", "message": "Impossible route"}),
        httpx.Response(400, json={"code": "NoSegment", "message": "Could not find a road"}),
        httpx.Response(200, json={"code": "Ok", "routes": []}),
    ],
)
def test_no_road_between_places_raises_no_route_found(response: httpx.Response) -> None:
    with pytest.raises(NoRouteFound):
        find_routes(DENVER, CHICAGO, client=fake_api(lambda request: response))


@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(400, json={"code": "InvalidQuery", "message": "Query string malformed"}),
        httpx.Response(503, text=""),
        httpx.Response(502, text="<html>Bad gateway</html>"),
        httpx.Response(200, json={"code": "TooBig"}),
        httpx.Response(200, json={"code": "Ok", "routes": [{"distance": 1}]}),
        httpx.Response(200, json=["not", "an", "object"]),
    ],
)
def test_service_problems_raise_routing_error(response: httpx.Response) -> None:
    with pytest.raises(RoutingError) as caught:
        find_routes(DENVER, CHICAGO, client=fake_api(lambda request: response))

    assert not isinstance(caught.value, NoRouteFound)


def test_network_failure_raises_routing_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("slow", request=request)

    with pytest.raises(RoutingError):
        find_routes(DENVER, CHICAGO, client=fake_api(handler))


def test_same_trip_is_served_from_cache() -> None:
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json=OSRM_RESPONSE)

    api = fake_api(handler)
    find_routes(DENVER, CHICAGO, client=api)
    find_routes((39.740001, -104.980001), CHICAGO, client=api)

    assert len(calls) == 1


def test_reverse_trip_is_a_different_lookup() -> None:
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json=OSRM_RESPONSE)

    api = fake_api(handler)
    find_routes(DENVER, CHICAGO, client=api)
    find_routes(CHICAGO, DENVER, client=api)

    assert len(calls) == 2


def test_routes_and_cache_hits_are_logged(caplog: pytest.LogCaptureFixture) -> None:
    api = fake_api(lambda request: httpx.Response(200, json=OSRM_RESPONSE))

    with caplog.at_level("DEBUG", logger="routing.clients.routing"):
        find_routes(DENVER, CHICAGO, client=api)
        find_routes(DENVER, CHICAGO, client=api)

    assert "route-1: 100.0 mi, 90 min, 2 points" in caplog.text
    assert "route cache hit" in caplog.text


FIRST = "https://first.example/route/v1/driving"
SECOND = "https://second.example/route/v1/driving"


def test_falls_back_to_the_next_server(settings: Any) -> None:
    settings.ROUTING_URLS = [FIRST, SECOND]
    hosts: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        hosts.append(request.url.host)
        if request.url.host == "first.example":
            raise httpx.ReadTimeout("slow", request=request)
        return httpx.Response(200, json=OSRM_RESPONSE)

    routes = find_routes(DENVER, CHICAGO, client=fake_api(handler))

    assert len(routes) == 2
    assert hosts == ["first.example", "second.example"]


def test_no_route_does_not_try_other_servers(settings: Any) -> None:
    settings.ROUTING_URLS = [FIRST, SECOND]
    hosts: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        hosts.append(request.url.host)
        return httpx.Response(400, json={"code": "NoRoute"})

    with pytest.raises(NoRouteFound):
        find_routes(DENVER, CHICAGO, client=fake_api(handler))

    assert hosts == ["first.example"]


def test_fails_when_every_server_fails(settings: Any) -> None:
    settings.ROUTING_URLS = [FIRST, SECOND]

    with pytest.raises(RoutingError):
        find_routes(DENVER, CHICAGO, client=fake_api(lambda request: httpx.Response(503)))


def test_fails_cleanly_with_no_servers(settings: Any) -> None:
    settings.ROUTING_URLS = []

    with pytest.raises(RoutingError):
        find_routes(DENVER, CHICAGO, client=fake_api(lambda request: httpx.Response(503)))
