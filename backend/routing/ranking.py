"""Ranking candidate routes by weather risk.

Each route is a list of segments. A segment is the stretch of road around one
checkpoint, so its risk level applies to all of its miles.

Routes are ranked the way the brief asks: fewest Severe miles, then fewest High
miles, then lowest average risk, then shortest time.
"""

from collections.abc import Sequence
from dataclasses import dataclass

from .risk import RiskLevel


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
    )


def _rank_key(score: RouteScore) -> tuple[float, float, float, float]:
    # Rounded so floating point noise (0.1 + 0.2) can't decide a tie.
    return (
        round(score.severe_miles, 2),
        round(score.high_miles, 2),
        round(score.average_risk, 4),
        round(score.duration_minutes, 2),
    )


def rank_routes(scores: Sequence[RouteScore]) -> list[RouteScore]:
    """Safest route first. Routes that tie on everything keep their original order."""
    return sorted(scores, key=_rank_key)
