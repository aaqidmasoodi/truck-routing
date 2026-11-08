import pytest

from routing.risk import RiskLevel, wind_risk_for_load


@pytest.mark.parametrize(
    ("speed", "weight", "expected"),
    [
        (20, 80_000, RiskLevel.LOW),
        (30, 80_000, RiskLevel.MODERATE),
        (40, 40_000, RiskLevel.HIGH),
        (40, 40_001, RiskLevel.SEVERE),
        (35, 45_000, RiskLevel.SEVERE),
        (44.9, 45_000, RiskLevel.SEVERE),
        (50, 30_000, RiskLevel.SEVERE),
        (50, 30_001, RiskLevel.NO_TRAVEL),
        (45, 35_000, RiskLevel.NO_TRAVEL),
        (55, 0, RiskLevel.NO_TRAVEL),
        (60, 10_000, RiskLevel.NO_TRAVEL),
    ],
)
def test_wind_risk_for_load(speed: float, weight: float, expected: RiskLevel) -> None:
    assert wind_risk_for_load(speed, weight) == expected


def test_light_truck_keeps_plain_wind_risk() -> None:
    assert wind_risk_for_load(50, 10_000) == RiskLevel.SEVERE


def test_negative_weight_is_rejected() -> None:
    with pytest.raises(ValueError):
        wind_risk_for_load(10, -1)
