import pytest

from routing.ranking import Segment, score_route
from routing.risk import RiskLevel

LOW, HIGH, SEVERE = RiskLevel.LOW, RiskLevel.HIGH, RiskLevel.SEVERE


def test_score_adds_up_miles_per_level() -> None:
    score = score_route(
        "a",
        [Segment(25, LOW), Segment(10, SEVERE), Segment(15, HIGH), Segment(5, SEVERE)],
        duration_minutes=60,
    )

    assert score.severe_miles == 15
    assert score.high_miles == 15
    assert score.duration_minutes == 60


def test_route_without_segments_is_rejected() -> None:
    with pytest.raises(ValueError):
        score_route("a", [], duration_minutes=10)


def test_negative_miles_are_rejected() -> None:
    with pytest.raises(ValueError):
        score_route("a", [Segment(-1, LOW)], duration_minutes=10)


def test_average_risk_is_weighted_by_distance() -> None:
    score = score_route("a", [Segment(90, LOW), Segment(10, SEVERE)], duration_minutes=60)

    assert score.average_risk == pytest.approx(0.3)


def test_average_risk_of_zero_length_route_uses_worst_level() -> None:
    score = score_route("a", [Segment(0, HIGH), Segment(0, LOW)], duration_minutes=1)

    assert score.average_risk == HIGH
