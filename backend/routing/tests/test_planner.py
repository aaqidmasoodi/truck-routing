from datetime import UTC, datetime

import pytest

from routing import planner
from routing.checkpoints import ScheduledCheckpoint
from routing.clients.routing import Route
from routing.clients.weather import Forecast, WeatherError
from routing.planner import PlannedRoute, assess, plan_route, plan_trip, recommend
from routing.polyline import Point
from routing.risk import Conditions, RiskLevel

LEAVING = datetime(2026, 11, 9, 8, 0, tzinfo=UTC)
CALM = Conditions(wind_mph=5, rain_in_per_hr=0, snow_in_per_hr=0)
GUSTY = Conditions(wind_mph=48, rain_in_per_hr=0, snow_in_per_hr=0)


def checkpoint(mile: float, segment: float = 10) -> ScheduledCheckpoint:
    return ScheduledCheckpoint(
        latitude=53.0, longitude=-7.0, mile=mile, segment_miles=segment, eta=LEAVING
    )


def test_each_checkpoint_gets_its_risk() -> None:
    planned = assess([checkpoint(0), checkpoint(10)], [CALM, GUSTY], weight_lb=20_000)

    assert [p.risk.level if p.risk else None for p in planned] == [
        RiskLevel.LOW,
        RiskLevel.SEVERE,
    ]


def test_weight_is_applied_to_wind() -> None:
    planned = assess([checkpoint(0)], [GUSTY], weight_lb=35_000)

    assert planned[0].risk is not None
    assert planned[0].risk.level == RiskLevel.NO_TRAVEL


def test_missing_forecast_means_unknown_risk() -> None:
    planned = assess([checkpoint(0)], [None], weight_lb=20_000)

    assert planned[0].risk is None
    assert planned[0].weather is None


def test_checkpoints_and_weather_must_line_up() -> None:
    with pytest.raises(ValueError):
        assess([checkpoint(0)], [CALM, CALM], weight_lb=20_000)


ROUTE = Route("route-1", distance_miles=30, duration_minutes=40, points=[])
SNOWY = Conditions(wind_mph=5, rain_in_per_hr=0, snow_in_per_hr=2.5)


def test_route_score_counts_miles_per_level() -> None:
    checkpoints = [checkpoint(0, 5), checkpoint(10, 10), checkpoint(20, 10), checkpoint(30, 5)]

    planned = plan_route(ROUTE, assess(checkpoints, [CALM, GUSTY, SNOWY, CALM], 20_000))

    assert planned.score.severe_miles == 20
    assert planned.score.high_miles == 0
    assert planned.score.duration_minutes == 40
    assert planned.unknown_miles == 0


def test_unknown_weather_is_counted_but_ranked_as_low() -> None:
    checkpoints = [checkpoint(0, 5), checkpoint(10, 10), checkpoint(20, 5)]

    planned = plan_route(ROUTE, assess(checkpoints, [CALM, None, None], 20_000))

    assert planned.unknown_miles == 15
    assert planned.score.average_risk == 0


def planned_route(route_id: str, minutes: float, weather: list[Conditions | None]) -> PlannedRoute:
    route = Route(route_id, distance_miles=20, duration_minutes=minutes, points=[])
    checkpoints = [checkpoint(0, 5), checkpoint(10, 10), checkpoint(20, 5)]
    return plan_route(route, assess(checkpoints, weather, 20_000))


def test_safest_route_is_recommended_over_the_fastest() -> None:
    fast = planned_route("fast", 30, [CALM, SNOWY, CALM])
    slow = planned_route("slow", 45, [CALM, CALM, CALM])

    plan = recommend([fast, slow])

    assert [p.route.id for p in plan.routes] == ["slow", "fast"]
    assert plan.reason == "10 fewer miles of Severe weather"
    assert plan.safe_to_travel


def test_fastest_wins_when_the_weather_is_the_same() -> None:
    plan = recommend([planned_route("a", 50, [CALM] * 3), planned_route("b", 40, [CALM] * 3)])

    assert plan.routes[0].route.id == "b"
    assert plan.reason == "10 min faster"


def test_single_route_says_so() -> None:
    plan = recommend([planned_route("a", 50, [CALM] * 3)])

    assert plan.reason == "The only route found"


def test_no_travel_on_every_route_is_flagged() -> None:
    blizzard = Conditions(wind_mph=60, rain_in_per_hr=0, snow_in_per_hr=4)
    plan = recommend([planned_route("a", 50, [CALM, blizzard, CALM])])

    assert not plan.safe_to_travel


def test_nothing_to_recommend() -> None:
    with pytest.raises(ValueError):
        recommend([])


def hourly(conditions: Conditions) -> Forecast:
    start = int(LEAVING.timestamp()) - 3600
    hours = list(range(start, start + 48 * 3600, 3600))
    return Forecast(
        times=hours,
        wind_mph=[conditions.wind_mph] * len(hours),
        rain_in_per_hr=[conditions.rain_in_per_hr] * len(hours),
        snow_in_per_hr=[conditions.snow_in_per_hr] * len(hours),
    )


NORTH = [(53.0, -7.0), (53.5, -7.0)]  # about 35 miles
NORTH_EAST = [(53.0, -7.0), (53.0, -6.9), (53.5, -6.9)]


def test_plan_trip_puts_it_all_together(monkeypatch: pytest.MonkeyPatch) -> None:
    routes = [
        Route("route-1", distance_miles=35, duration_minutes=40, points=NORTH),
        Route("route-2", distance_miles=40, duration_minutes=50, points=NORTH_EAST),
    ]
    monkeypatch.setattr(planner, "find_routes", lambda origin, destination: routes)
    lookups: list[int] = []

    def forecasts(points: list[Point]) -> list[Forecast]:
        lookups.append(len(points))
        # Storm along the straight road (longitude -7.0), calm on the detour.
        return [hourly(GUSTY if lon == -7.0 else CALM) for _, lon in points]

    monkeypatch.setattr(planner, "fetch_forecasts", forecasts)

    plan = plan_trip(NORTH[0], NORTH[-1], 20_000, spacing_miles=10, departure=LEAVING)

    assert len(lookups) == 1
    assert [p.route.id for p in plan.routes] == ["route-2", "route-1"]
    assert plan.routes[1].score.severe_miles == pytest.approx(35)
    assert plan.reason.endswith("fewer miles of Severe weather")


def test_plan_trip_survives_a_forecast_outage(monkeypatch: pytest.MonkeyPatch) -> None:
    route = Route("route-1", distance_miles=35, duration_minutes=40, points=NORTH)
    monkeypatch.setattr(planner, "find_routes", lambda origin, destination: [route])

    def down(points: list[Point]) -> list[Forecast]:
        raise WeatherError("down")

    monkeypatch.setattr(planner, "fetch_forecasts", down)

    plan = plan_trip(NORTH[0], NORTH[-1], 20_000, spacing_miles=10, departure=LEAVING)

    assert plan.routes[0].unknown_miles == pytest.approx(35)
