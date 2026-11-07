import pytest

from routing.risk import RiskLevel, wind_risk


def test_levels_are_ordered_from_safest_to_worst() -> None:
    assert (
        RiskLevel.LOW < RiskLevel.MODERATE < RiskLevel.HIGH < RiskLevel.SEVERE < RiskLevel.NO_TRAVEL
    )


def test_label_is_human_readable() -> None:
    assert RiskLevel.NO_TRAVEL.label == "No Travel"
    assert RiskLevel.LOW.label == "Low"


@pytest.mark.parametrize(
    ("speed", "expected"),
    [
        (0, RiskLevel.LOW),
        (24.9, RiskLevel.LOW),
        (25, RiskLevel.MODERATE),
        (34.9, RiskLevel.MODERATE),
        (35, RiskLevel.HIGH),
        (44.9, RiskLevel.HIGH),
        (45, RiskLevel.SEVERE),
        (54.9, RiskLevel.SEVERE),
        (55, RiskLevel.NO_TRAVEL),
        (80, RiskLevel.NO_TRAVEL),
    ],
)
def test_wind_risk(speed: float, expected: RiskLevel) -> None:
    assert wind_risk(speed) == expected


def test_wind_risk_rejects_negative_speed() -> None:
    with pytest.raises(ValueError):
        wind_risk(-1)
