from datetime import UTC, datetime

import pytest

from routing.checkpoints import ScheduledCheckpoint
from routing.clients.routing import Route
from routing.planner import assess, plan_route
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
