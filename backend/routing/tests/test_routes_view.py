from typing import Any

import pytest
from django.test import Client
from django.urls import reverse

from routing import views
from routing.clients.routing import NoRouteFound, Route, RoutingError
from routing.polyline import Point

TRIP = {
    "origin": {"latitude": 39.74, "longitude": -104.98},
    "destination": {"latitude": 41.88, "longitude": -87.63},
}
ROUTE = Route("route-1", 1003.2, 905.5, [(39.74, -104.98), (41.88, -87.63)])


def post(client: Client, body: dict[str, Any]) -> Any:
    return client.post(reverse("routes"), body, content_type="application/json")


def test_routes_returns_each_option(client: Client, monkeypatch: pytest.MonkeyPatch) -> None:
    asked: list[tuple[Point, Point]] = []

    def fake_find(origin: Point, destination: Point) -> list[Route]:
        asked.append((origin, destination))
        return [ROUTE]

    monkeypatch.setattr(views, "find_routes", fake_find)

    response = post(client, TRIP)

    assert response.status_code == 200
    assert asked == [((39.74, -104.98), (41.88, -87.63))]
    assert response.json() == [
        {
            "id": "route-1",
            "distance_miles": 1003.2,
            "duration_minutes": 905.5,
            "points": [[39.74, -104.98], [41.88, -87.63]],
        }
    ]


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"origin": TRIP["origin"]},
        {**TRIP, "origin": {"latitude": 95, "longitude": 0}},
        {**TRIP, "destination": TRIP["origin"]},
    ],
)
def test_bad_trips_are_rejected(client: Client, body: dict[str, Any]) -> None:
    assert post(client, body).status_code == 400


def test_no_road_route_is_a_404(client: Client, monkeypatch: pytest.MonkeyPatch) -> None:
    def no_route(origin: Point, destination: Point) -> list[Route]:
        raise NoRouteFound("ocean")

    monkeypatch.setattr(views, "find_routes", no_route)

    response = post(client, TRIP)

    assert response.status_code == 404
    assert "no road route" in response.json()["detail"]


def test_routing_outage_is_a_502(client: Client, monkeypatch: pytest.MonkeyPatch) -> None:
    def broken(origin: Point, destination: Point) -> list[Route]:
        raise RoutingError("down")

    monkeypatch.setattr(views, "find_routes", broken)

    assert post(client, TRIP).status_code == 502
