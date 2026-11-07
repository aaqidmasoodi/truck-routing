import pytest

from routing.ranking import RouteScore, Segment, rank_routes, score_route, why_ahead
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


def make(
    route_id: str, severe: float = 0, high: float = 0, avg: float = 0, minutes: float = 60
) -> RouteScore:
    return RouteScore(route_id, severe, high, avg, minutes)


def ids(scores: list[RouteScore]) -> list[str]:
    return [score.route_id for score in scores]


def test_fewest_severe_miles_wins_even_if_slower() -> None:
    ranked = rank_routes([make("fast", severe=5, minutes=60), make("slow", minutes=120)])

    assert ids(ranked) == ["slow", "fast"]


def test_high_miles_break_a_severe_tie() -> None:
    ranked = rank_routes([make("a", severe=5, high=20), make("b", severe=5, high=10)])

    assert ids(ranked) == ["b", "a"]


def test_average_risk_breaks_a_high_tie() -> None:
    ranked = rank_routes([make("a", high=10, avg=1.2), make("b", high=10, avg=0.8)])

    assert ids(ranked) == ["b", "a"]


def test_time_breaks_the_last_tie() -> None:
    ranked = rank_routes([make("a", minutes=90), make("b", minutes=75)])

    assert ids(ranked) == ["b", "a"]


def test_float_noise_does_not_decide_a_tie() -> None:
    ranked = rank_routes([make("a", high=0.1 + 0.2, minutes=50), make("b", high=0.3, minutes=40)])

    assert ids(ranked) == ["b", "a"]


def test_full_ties_keep_the_original_order() -> None:
    assert ids(rank_routes([make("a"), make("b"), make("c")])) == ["a", "b", "c"]


def test_no_travel_miles_are_counted() -> None:
    score = score_route(
        "a", [Segment(4, RiskLevel.NO_TRAVEL), Segment(6, SEVERE)], duration_minutes=20
    )

    assert score.no_travel_miles == 4
    assert score.severe_miles == 6


def test_any_no_travel_miles_rank_below_severe_miles() -> None:
    blocked = RouteScore("blocked", 0, 0, 0.1, 60, no_travel_miles=1)
    stormy = make("stormy", severe=40, high=30, avg=2.5)

    assert ids(rank_routes([blocked, stormy])) == ["stormy", "blocked"]


@pytest.mark.parametrize(
    ("best", "other", "reason"),
    [
        (
            make("a"),
            RouteScore("b", 0, 0, 0, 60, no_travel_miles=3),
            "Avoids 3 mi of No Travel weather",
        ),
        (make("a", severe=2), make("b", severe=14.5), "12.5 fewer miles of Severe weather"),
        (make("a", high=5), make("b", high=15), "10 fewer miles of High risk weather"),
        (make("a", avg=0.5), make("b", avg=1.25), "Lower average risk (0.50 vs 1.25)"),
        (make("a", minutes=50), make("b", minutes=65), "15 min faster"),
        (make("a"), make("b"), "Same risk and time"),
    ],
)
def test_why_ahead_names_the_deciding_rule(
    best: RouteScore, other: RouteScore, reason: str
) -> None:
    assert why_ahead(best, other) == reason
