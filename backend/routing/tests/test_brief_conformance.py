"""The risk, load, ranking and checkpoint rules checked against the brief, case by case.

Each rule is written out again here, straight from the brief's tables and wording, as a
reference. The app's own code is then swept across thousands of inputs and has to agree
with the reference every time, so a slip in a band edge or a ranking step can't hide
between a handful of hand-picked examples.
"""

import random
from datetime import UTC, datetime, timedelta

import pytest

from routing.checkpoints import place_checkpoints, schedule
from routing.ranking import RouteScore, Segment, rank_routes, score_route
from routing.risk import (
    Conditions,
    RiskLevel,
    checkpoint_risk,
    rain_risk,
    snow_risk,
    wind_risk,
    wind_risk_for_load,
)

LOW, MODERATE, HIGH, SEVERE, NO_TRAVEL = (
    RiskLevel.LOW,
    RiskLevel.MODERATE,
    RiskLevel.HIGH,
    RiskLevel.SEVERE,
    RiskLevel.NO_TRAVEL,
)


# The brief's tables, as reference functions.


def brief_wind(mph: float) -> RiskLevel:
    # Low <25, Moderate 25-34, High 35-44, Severe 45-54, No Travel >=55.
    if mph >= 55:
        return NO_TRAVEL
    if mph >= 45:
        return SEVERE
    if mph >= 35:
        return HIGH
    if mph >= 25:
        return MODERATE
    return LOW


def brief_rain(rate: float) -> RiskLevel:
    # Low <0.10, Moderate 0.10-0.25, High 0.25-0.50, Severe 0.50-1.00, No Travel >1.00.
    # A shared edge (0.25, 0.50) goes to the higher band, as wind's edges do.
    if rate > 1.00:
        return NO_TRAVEL
    if rate >= 0.50:
        return SEVERE
    if rate >= 0.25:
        return HIGH
    if rate >= 0.10:
        return MODERATE
    return LOW


def brief_snow(rate: float) -> RiskLevel:
    # Low <0.5, Moderate 0.5-1.0, High 1.0-2.0, Severe 2.0-3.0, No Travel >3.0.
    if rate > 3.0:
        return NO_TRAVEL
    if rate >= 2.0:
        return SEVERE
    if rate >= 1.0:
        return HIGH
    if rate >= 0.5:
        return MODERATE
    return LOW


def brief_wind_with_load(mph: float, weight: float) -> RiskLevel:
    # >=55 mph: No Travel for any load. 45-54 mph and >30,000 lb: No Travel.
    # 35-44 mph and >40,000 lb: Severe.
    if mph >= 55:
        return NO_TRAVEL
    if 45 <= mph < 55 and weight > 30_000:
        return NO_TRAVEL
    if 35 <= mph < 45 and weight > 40_000:
        return SEVERE
    return brief_wind(mph)


def steps(start: float, stop: float, step: float) -> list[float]:
    count = round((stop - start) / step)
    return [round(start + i * step, 6) for i in range(count + 1)]


# Every band, swept finely.

WIND_SPEEDS = steps(0, 100, 0.1)
RAIN_RATES = steps(0, 2, 0.005)
SNOW_RATES = steps(0, 5, 0.01)


@pytest.mark.parametrize("mph", WIND_SPEEDS)
def test_wind_matches_the_table(mph: float) -> None:
    assert wind_risk(mph) == brief_wind(mph)


@pytest.mark.parametrize("rate", RAIN_RATES)
def test_rain_matches_the_table(rate: float) -> None:
    assert rain_risk(rate) == brief_rain(rate)


@pytest.mark.parametrize("rate", SNOW_RATES)
def test_snow_matches_the_table(rate: float) -> None:
    assert snow_risk(rate) == brief_snow(rate)


# Every edge in the brief, by name, so a failure says which line of the table broke.


@pytest.mark.parametrize(
    ("mph", "expected"),
    [
        (24.99, LOW),
        (25, MODERATE),
        (34, MODERATE),
        (34.99, MODERATE),
        (35, HIGH),
        (44, HIGH),
        (44.99, HIGH),
        (45, SEVERE),
        (54, SEVERE),
        (54.99, SEVERE),
        (55, NO_TRAVEL),
        (200, NO_TRAVEL),
    ],
)
def test_wind_edges(mph: float, expected: RiskLevel) -> None:
    assert wind_risk(mph) == expected


@pytest.mark.parametrize(
    ("rate", "expected"),
    [
        (0.099, LOW),
        (0.10, MODERATE),
        (0.249, MODERATE),
        (0.25, HIGH),
        (0.499, HIGH),
        (0.50, SEVERE),
        (1.00, SEVERE),
        (1.001, NO_TRAVEL),
    ],
)
def test_rain_edges(rate: float, expected: RiskLevel) -> None:
    assert rain_risk(rate) == expected


@pytest.mark.parametrize(
    ("rate", "expected"),
    [
        (0.499, LOW),
        (0.5, MODERATE),
        (0.999, MODERATE),
        (1.0, HIGH),
        (1.999, HIGH),
        (2.0, SEVERE),
        (3.0, SEVERE),
        (3.001, NO_TRAVEL),
    ],
)
def test_snow_edges(rate: float, expected: RiskLevel) -> None:
    assert snow_risk(rate) == expected


# Load rules, across a grid of wind speeds and weights including every edge.

LOAD_WEIGHTS = [0, 10_000, 29_999, 30_000, 30_001, 35_000, 39_999, 40_000, 40_001, 60_000, 80_000]
LOAD_SPEEDS = [*steps(0, 70, 0.5), 34.99, 44.99, 54.99]


@pytest.mark.parametrize("weight", LOAD_WEIGHTS)
@pytest.mark.parametrize("mph", LOAD_SPEEDS)
def test_load_rules_match_the_brief(mph: float, weight: float) -> None:
    assert wind_risk_for_load(mph, weight) == brief_wind_with_load(mph, weight)


@pytest.mark.parametrize(
    ("mph", "weight", "expected", "rule"),
    [
        (55, 0, NO_TRAVEL, ">=55 mph is No Travel for any load"),
        (55, 80_000, NO_TRAVEL, ">=55 mph is No Travel for any load"),
        (45, 30_001, NO_TRAVEL, "45-54 mph with >30,000 lb is No Travel"),
        (54.9, 30_001, NO_TRAVEL, "45-54 mph with >30,000 lb is No Travel"),
        (45, 30_000, SEVERE, "exactly 30,000 lb is not more than 30,000"),
        (44.9, 80_000, SEVERE, "44 mph is in the 35-44 band, not 45-54"),
        (35, 40_001, SEVERE, "35-44 mph with >40,000 lb is Severe"),
        (35, 40_000, HIGH, "exactly 40,000 lb is not more than 40,000"),
        (34.9, 80_000, MODERATE, "34 mph is below the 35-44 band"),
        (24.9, 80_000, LOW, "light wind is Low however heavy the truck"),
    ],
)
def test_each_load_rule(mph: float, weight: float, expected: RiskLevel, rule: str) -> None:
    assert wind_risk_for_load(mph, weight) == expected, rule


# Properties that must hold everywhere.


@pytest.mark.parametrize("weight", LOAD_WEIGHTS)
def test_more_wind_is_never_safer(weight: float) -> None:
    levels = [wind_risk_for_load(mph, weight) for mph in WIND_SPEEDS]
    assert levels == sorted(levels)


@pytest.mark.parametrize("mph", LOAD_SPEEDS)
def test_a_heavier_truck_is_never_safer(mph: float) -> None:
    levels = [wind_risk_for_load(mph, weight) for weight in sorted(LOAD_WEIGHTS)]
    assert levels == sorted(levels)


def test_more_rain_or_snow_is_never_safer() -> None:
    assert [rain_risk(r) for r in RAIN_RATES] == sorted(rain_risk(r) for r in RAIN_RATES)
    assert [snow_risk(r) for r in SNOW_RATES] == sorted(snow_risk(r) for r in SNOW_RATES)


def test_a_checkpoint_takes_its_worst_condition() -> None:
    chooser = random.Random(7)
    for _ in range(3000):
        conditions = Conditions(
            wind_mph=chooser.uniform(0, 70),
            rain_in_per_hr=chooser.uniform(0, 1.5),
            snow_in_per_hr=chooser.uniform(0, 4),
        )
        weight = chooser.choice(LOAD_WEIGHTS)
        expected = max(
            brief_wind_with_load(conditions.wind_mph, weight),
            brief_rain(conditions.rain_in_per_hr),
            brief_snow(conditions.snow_in_per_hr),
        )
        assert checkpoint_risk(conditions, weight).level == expected, (conditions, weight)


def test_the_cause_is_always_one_of_the_worst_conditions() -> None:
    chooser = random.Random(11)
    for _ in range(1000):
        risk = checkpoint_risk(
            Conditions(chooser.uniform(0, 70), chooser.uniform(0, 1.5), chooser.uniform(0, 4)),
            chooser.choice(LOAD_WEIGHTS),
        )
        levels = {"wind": risk.wind, "rain": risk.rain, "snow": risk.snow}
        if risk.level == LOW:
            assert risk.causes == []
        else:
            assert risk.causes
            assert all(levels[cause] == risk.level for cause in risk.causes)


# Ranking: fewest Severe miles, then fewest High miles, then lowest average risk, then
# shortest time. No Travel miles come before all of that, since the truck shouldn't go.


def brief_order(scores: list[RouteScore]) -> list[str]:
    def key(score: RouteScore) -> tuple[float, ...]:
        return (
            round(score.no_travel_miles, 2),
            round(score.severe_miles, 2),
            round(score.high_miles, 2),
            round(score.average_risk, 4),
            round(score.duration_minutes, 2),
        )

    return [score.route_id for score in sorted(scores, key=key)]


def random_route(chooser: random.Random, route_id: str) -> RouteScore:
    # Mostly Low weather with the odd bad patch, like a real forecast.
    levels = (
        [LOW] * 6 + [MODERATE] * 3 + [HIGH] * 2 + [SEVERE] + [NO_TRAVEL] * (chooser.random() < 0.2)
    )
    segments = [
        Segment(miles=chooser.choice([10, 25, 50, 12.5]), risk=chooser.choice(levels))
        for _ in range(chooser.randint(1, 40))
    ]
    return score_route(route_id, segments, duration_minutes=chooser.randint(60, 1500))


@pytest.mark.parametrize("seed", range(2000))
def test_ranking_follows_the_brief(seed: int) -> None:
    chooser = random.Random(seed)
    scores = [random_route(chooser, f"route-{n}") for n in range(1, chooser.randint(2, 3) + 1)]

    assert [score.route_id for score in rank_routes(scores)] == brief_order(scores)


def score(
    route_id: str,
    *,
    severe: float = 0,
    high: float = 0,
    avg: float = 0,
    mins: float = 600,
    no_travel: float = 0,
) -> RouteScore:
    return RouteScore(route_id, severe, high, avg, mins, no_travel)


@pytest.mark.parametrize(
    ("better", "worse", "rule"),
    [
        (score("a", severe=0, mins=900), score("b", severe=5, mins=300), "Severe miles beat time"),
        (score("a", severe=5, high=100), score("b", severe=10), "Severe miles beat High miles"),
        (score("a", high=10, avg=3), score("b", high=20, avg=0.1), "High miles beat average"),
        (score("a", avg=0.5, mins=900), score("b", avg=0.6, mins=300), "average beats time"),
        (score("a", mins=300), score("b", mins=301), "time breaks the last tie"),
        (score("a", no_travel=0, severe=50), score("b", no_travel=5), "No Travel is worst of all"),
    ],
)
def test_each_ranking_step_outranks_the_next(
    better: RouteScore, worse: RouteScore, rule: str
) -> None:
    assert [s.route_id for s in rank_routes([worse, better])] == ["a", "b"], rule


def test_average_risk_is_weighted_by_miles() -> None:
    # 90 miles of Low and 10 of Severe average 0.3, not (0 + 3) / 2.
    scored = score_route("r", [Segment(90, LOW), Segment(10, SEVERE)], 60)

    assert scored.average_risk == pytest.approx(0.3)
    assert scored.severe_miles == 10
    assert scored.high_miles == 0


# Checkpoints every 10, 25 or 50 miles, timed by the truck's arrival.

DEPARTURE = datetime(2026, 11, 9, 6, 0, tzinfo=UTC)


def straight_road(miles: float) -> list[tuple[float, float]]:
    # Due north, about 69 miles to a degree of latitude, a point every half mile.
    count = max(2, int(miles * 2))
    return [(30 + (miles / 69.0) * i / (count - 1), -100.0) for i in range(count)]


@pytest.mark.parametrize("spacing", [10, 25, 50])
@pytest.mark.parametrize("miles", [3, 9.9, 10, 24, 26, 49, 51, 99.5, 100, 137, 250, 999, 1500])
def test_checkpoints_are_spaced_as_asked(spacing: int, miles: float) -> None:
    placed = place_checkpoints(straight_road(miles), spacing, road_miles=miles)
    marks = [checkpoint.mile for checkpoint in placed]

    assert marks[0] == 0
    assert marks[-1] == pytest.approx(miles)
    # Every gap is the spacing, except the last, which can be shorter (or a little longer
    # when a mark right next to the destination is dropped).
    for gap in (b - a for a, b in zip(marks[:-2], marks[1:-1], strict=True)):
        assert gap == pytest.approx(spacing)
    if len(marks) > 1:
        assert 0 < marks[-1] - marks[-2] < spacing * 1.25 + 1e-9
    # Each checkpoint's share of the road adds back up to the whole route.
    assert sum(checkpoint.segment_miles for checkpoint in placed) == pytest.approx(miles)


@pytest.mark.parametrize("spacing", [10, 25, 50])
@pytest.mark.parametrize("hours", [0.5, 3, 17.8, 40])
def test_arrival_times_follow_the_truck(spacing: int, hours: float) -> None:
    miles = 600
    placed = place_checkpoints(straight_road(miles), spacing, road_miles=miles)

    timed = schedule(placed, DEPARTURE, hours * 60)

    assert timed[0].eta == DEPARTURE
    assert timed[-1].eta == DEPARTURE + timedelta(hours=hours)
    for checkpoint in timed:
        share = checkpoint.mile / miles
        expected = DEPARTURE + timedelta(hours=hours * share)
        assert abs((checkpoint.eta - expected).total_seconds()) < 1
    assert [c.eta for c in timed] == sorted(c.eta for c in timed)


@pytest.mark.parametrize("spacing", [10, 25, 50])
def test_closer_spacing_means_more_checkpoints(spacing: int) -> None:
    road = straight_road(500)
    counts = {s: len(place_checkpoints(road, s, road_miles=500)) for s in (10, 25, 50)}

    assert counts[10] > counts[25] > counts[50]
    assert counts[spacing] == pytest.approx(500 / spacing + 1, abs=1)
