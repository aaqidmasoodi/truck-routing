from datetime import timedelta
from typing import Any

import pytest
from django.test import Client
from django.urls import reverse
from django.utils import timezone
from django.utils.dateparse import parse_datetime

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
    route = response.json()[0]
    assert route["id"] == "route-1"
    assert route["distance_miles"] == 1003.2
    assert route["duration_minutes"] == 905.5
    assert route["points"] == [[39.74, -104.98], [41.88, -87.63]]


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


def test_each_route_comes_with_checkpoints(client: Client, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(views, "find_routes", lambda origin, destination: [ROUTE])
    leaving = (timezone.now() + timedelta(hours=2)).replace(microsecond=0)

    response = post(client, {**TRIP, "spacing_miles": 50, "departure": leaving.isoformat()})

    checkpoints = response.json()[0]["checkpoints"]
    assert response.status_code == 200
    assert [c["mile"] for c in checkpoints[:3]] == [0, 50, 100]
    assert checkpoints[-1]["mile"] == 1003.2
    assert len(checkpoints) == 22
    assert parse_datetime(checkpoints[0]["eta"]) == leaving
    assert parse_datetime(checkpoints[-1]["eta"]) == leaving + timedelta(minutes=905.5)


def test_spacing_defaults_to_25_miles(client: Client, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(views, "find_routes", lambda origin, destination: [ROUTE])

    checkpoints = post(client, TRIP).json()[0]["checkpoints"]

    assert checkpoints[1]["mile"] == 25


@pytest.mark.parametrize(
    "extra",
    [
        {"spacing_miles": 30},
        {"departure": "not a date"},
        {"departure": "2020-01-01T08:00:00Z"},
        {"departure": "2999-01-01T08:00:00Z"},
    ],
)
def test_bad_spacing_or_departure_is_rejected(client: Client, extra: dict[str, Any]) -> None:
    assert post(client, {**TRIP, **extra}).status_code == 400
