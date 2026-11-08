from datetime import timedelta
from typing import Any

import pytest
from django.test import Client
from django.urls import reverse
from django.utils import timezone

from routing import planner
from routing.clients.routing import NoRouteFound, Route, RoutingError
from routing.clients.weather import Forecast
from routing.polyline import Point

TRIP = {
    "origin": {"latitude": 53.0, "longitude": -7.0},
    "destination": {"latitude": 53.5, "longitude": -7.0},
    "weight_lb": 35_000,
    "spacing_miles": 10,
}
STRAIGHT = Route("route-1", 35, 40, [(53.0, -7.0), (53.5, -7.0)])
DETOUR = Route("route-2", 40, 50, [(53.0, -7.0), (53.0, -6.9), (53.5, -6.9)])


def forecast(wind_mph: float) -> Forecast:
    start = int(timezone.now().timestamp()) // 3600 * 3600 - 3600
    hours = list(range(start, start + 96 * 3600, 3600))
    zeros = [0.0] * len(hours)
    return Forecast(hours, [wind_mph] * len(hours), zeros, zeros)


@pytest.fixture
def stormy_straight_road(monkeypatch: pytest.MonkeyPatch) -> None:
    """48 mph wind along the straight road after the start, calm everywhere else."""
    monkeypatch.setattr(planner, "find_routes", lambda origin, destination: [STRAIGHT, DETOUR])
    monkeypatch.setattr(
        planner,
        "fetch_forecasts",
        lambda points: [forecast(48 if lon == -7.0 and lat > 53.01 else 5) for lat, lon in points],
    )


def post(client: Client, body: dict[str, Any]) -> Any:
    return client.post(reverse("plan"), body, content_type="application/json")


@pytest.mark.usefixtures("stormy_straight_road")
def test_plan_recommends_the_safer_detour(client: Client) -> None:
    response = post(client, TRIP)

    assert response.status_code == 200
    body = response.json()
    assert body["recommended_route_id"] == "route-2"
    assert body["safe_to_travel"] is True
    assert [route["id"] for route in body["routes"]] == ["route-2", "route-1"]
    assert body["reason"] == "Avoids 30 mi of No Travel weather"


@pytest.mark.usefixtures("stormy_straight_road")
def test_heavy_truck_turns_severe_wind_into_no_travel(client: Client) -> None:
    straight = post(client, TRIP).json()["routes"][1]

    assert straight["checkpoints"][1]["risk"]["level"]["label"] == "No Travel"
    assert straight["score"]["no_travel_miles"] == pytest.approx(30)


@pytest.mark.usefixtures("stormy_straight_road")
def test_light_truck_only_gets_severe(client: Client) -> None:
    straight = post(client, {**TRIP, "weight_lb": 20_000}).json()["routes"][1]

    assert straight["checkpoints"][1]["risk"]["level"]["label"] == "Severe"


@pytest.mark.usefixtures("stormy_straight_road")
def test_departure_moves_the_arrival_times(client: Client) -> None:
    leaving = (timezone.now() + timedelta(hours=5)).replace(microsecond=0)

    body = post(client, {**TRIP, "departure": leaving.isoformat()}).json()

    first = body["routes"][0]["checkpoints"][0]
    assert first["eta"].startswith(leaving.strftime("%Y-%m-%dT%H:%M"))


def test_weight_is_required(client: Client) -> None:
    response = post(client, {key: value for key, value in TRIP.items() if key != "weight_lb"})

    assert response.status_code == 400
    assert "weight_lb" in response.json()


@pytest.mark.parametrize(
    ("error", "status_code"),
    [(NoRouteFound("sea"), 404), (RoutingError("down"), 502)],
)
def test_routing_problems_are_explained(
    client: Client, monkeypatch: pytest.MonkeyPatch, error: Exception, status_code: int
) -> None:
    def fail(origin: Point, destination: Point) -> list[Route]:
        raise error

    monkeypatch.setattr(planner, "find_routes", fail)

    response = post(client, TRIP)

    assert response.status_code == status_code
    assert response.json()["detail"]
