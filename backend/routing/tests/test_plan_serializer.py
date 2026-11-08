from datetime import UTC, datetime

from routing.checkpoints import ScheduledCheckpoint
from routing.clients.routing import Route
from routing.planner import assess, plan_route, recommend
from routing.risk import Conditions
from routing.serializers import TripPlanSerializer

LEAVING = datetime(2026, 11, 9, 8, 0, tzinfo=UTC)


def test_plan_serializes_for_the_frontend() -> None:
    route = Route("route-1", distance_miles=10, duration_minutes=15, points=[(53.0, -7.0)])
    checkpoints = [
        ScheduledCheckpoint(53.0, -7.0, mile=0, segment_miles=5, eta=LEAVING),
        ScheduledCheckpoint(53.1, -7.0, mile=10, segment_miles=5, eta=LEAVING),
    ]
    rainy = Conditions(wind_mph=10, rain_in_per_hr=0.3, snow_in_per_hr=0)
    plan = recommend([plan_route(route, assess(checkpoints, [rainy, None], 20_000))])

    data = TripPlanSerializer(plan).data

    assert data["recommended_route_id"] == "route-1"
    assert data["reason"] == "The only route found"
    assert data["safe_to_travel"] is True
    planned = data["routes"][0]
    assert planned["score"] == {
        "no_travel_miles": 0,
        "severe_miles": 0,
        "high_miles": 5,
        "average_risk": 1,
    }
    assert planned["unknown_weather_miles"] == 5
    first, second = planned["checkpoints"]
    assert first["risk"]["level"] == {"value": 2, "label": "High"}
    assert first["risk"]["causes"] == ["rain"]
    assert first["weather"]["rain_in_per_hr"] == 0.3
    assert second["risk"] is None
    assert second["weather"] is None
