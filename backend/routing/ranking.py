"""Ranking candidate routes by weather risk.

Each route is a list of segments. A segment is the stretch of road around one
checkpoint, so its risk level applies to all of its miles.

Routes are ranked the way the brief asks: fewest Severe miles, then fewest High
miles, then lowest average risk, then shortest time.

The brief doesn't rank No Travel miles, but they mean the truck shouldn't go at
all, so they're checked before anything else.
"""

import logging
from collections.abc import Sequence
from dataclasses import dataclass

from .risk import RiskLevel

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Segment:
    miles: float
    risk: RiskLevel


@dataclass(frozen=True)
class RouteScore:
    route_id: str
    severe_miles: float
    high_miles: float
    average_risk: float
    duration_minutes: float
    no_travel_miles: float = 0


def _miles_at(segments: Sequence[Segment], level: RiskLevel) -> float:
    return sum(segment.miles for segment in segments if segment.risk == level)


def _average_risk(segments: Sequence[Segment]) -> float:
    """Risk level averaged over distance, so a long stretch counts more than a short one."""
    total_miles = sum(segment.miles for segment in segments)
    if total_miles == 0:
        return max(segment.risk for segment in segments)
    return sum(segment.risk * segment.miles for segment in segments) / total_miles


def score_route(route_id: str, segments: Sequence[Segment], duration_minutes: float) -> RouteScore:
    if not segments:
        raise ValueError(f"Route {route_id} has no segments")
    if any(segment.miles < 0 for segment in segments):
        raise ValueError(f"Route {route_id} has a segment with negative miles")

    return RouteScore(
        route_id=route_id,
        severe_miles=_miles_at(segments, RiskLevel.SEVERE),
        high_miles=_miles_at(segments, RiskLevel.HIGH),
        average_risk=_average_risk(segments),
        duration_minutes=duration_minutes,
        no_travel_miles=_miles_at(segments, RiskLevel.NO_TRAVEL),
    )


def _rank_key(score: RouteScore) -> tuple[float, float, float, float, float]:
    # Rounded so floating point noise (0.1 + 0.2) can't decide a tie.
    return (
        round(score.no_travel_miles, 2),
        round(score.severe_miles, 2),
        round(score.high_miles, 2),
        round(score.average_risk, 4),
        round(score.duration_minutes, 2),
    )


def rank_routes(scores: Sequence[RouteScore]) -> list[RouteScore]:
    """Safest route first. Routes that tie on everything keep their original order."""
    ranked = sorted(scores, key=_rank_key)
    for position, score in enumerate(ranked, start=1):
        logger.debug(
            "#%d %s (no travel, severe, high, avg, minutes) = %s",
            position,
            score.route_id,
            _rank_key(score),
        )
    return ranked


def _number(value: float) -> str:
    return f"{value:.1f}".removesuffix(".0")


def why_ahead(best: RouteScore, other: RouteScore) -> str:
    """The first ranking rule that puts `best` ahead of `other`, in plain words."""
    if round(best.no_travel_miles, 2) < round(other.no_travel_miles, 2):
        return f"Avoids {_number(other.no_travel_miles)} mi of No Travel weather"
    if round(best.severe_miles, 2) < round(other.severe_miles, 2):
        return f"{_number(other.severe_miles - best.severe_miles)} fewer miles of Severe weather"
    if round(best.high_miles, 2) < round(other.high_miles, 2):
        return f"{_number(other.high_miles - best.high_miles)} fewer miles of High risk weather"
    if round(best.average_risk, 4) < round(other.average_risk, 4):
        return f"Lower average risk ({best.average_risk:.2f} vs {other.average_risk:.2f})"
    if round(best.duration_minutes, 2) < round(other.duration_minutes, 2):
        return f"{_number(other.duration_minutes - best.duration_minutes)} min faster"
    return "Same risk and time"
