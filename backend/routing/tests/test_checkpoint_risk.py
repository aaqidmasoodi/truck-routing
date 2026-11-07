import pytest

from routing.risk import Conditions, RiskLevel, checkpoint_risk

CALM = Conditions(wind_mph=5, rain_in_per_hr=0, snow_in_per_hr=0)


def test_calm_weather_is_low_risk() -> None:
    assert checkpoint_risk(CALM, 30_000).level == RiskLevel.LOW


@pytest.mark.parametrize(
    ("conditions", "expected"),
    [
        (Conditions(wind_mph=30, rain_in_per_hr=0.3, snow_in_per_hr=0), RiskLevel.HIGH),
        (Conditions(wind_mph=10, rain_in_per_hr=0.05, snow_in_per_hr=2.5), RiskLevel.SEVERE),
        (Conditions(wind_mph=40, rain_in_per_hr=1.5, snow_in_per_hr=0), RiskLevel.NO_TRAVEL),
    ],
)
def test_worst_condition_wins(conditions: Conditions, expected: RiskLevel) -> None:
    assert checkpoint_risk(conditions, 20_000).level == expected


def test_heavy_load_can_raise_the_overall_level() -> None:
    windy = Conditions(wind_mph=48, rain_in_per_hr=0.2, snow_in_per_hr=0)

    assert checkpoint_risk(windy, 20_000).level == RiskLevel.SEVERE
    assert checkpoint_risk(windy, 35_000).level == RiskLevel.NO_TRAVEL


def test_each_condition_is_kept_for_display() -> None:
    risk = checkpoint_risk(Conditions(wind_mph=30, rain_in_per_hr=0.3, snow_in_per_hr=0), 20_000)

    assert (risk.wind, risk.rain, risk.snow) == (
        RiskLevel.MODERATE,
        RiskLevel.HIGH,
        RiskLevel.LOW,
    )


def test_causes_name_the_worst_conditions() -> None:
    stormy = Conditions(wind_mph=40, rain_in_per_hr=0.3, snow_in_per_hr=0.2)

    assert checkpoint_risk(stormy, 20_000).causes == ["wind", "rain"]


def test_low_risk_has_no_causes() -> None:
    assert checkpoint_risk(CALM, 20_000).causes == []
