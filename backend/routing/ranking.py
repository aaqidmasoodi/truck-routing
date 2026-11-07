"""Ranking candidate routes by weather risk.

Each route is a list of segments. A segment is the stretch of road around one
checkpoint, so its risk level applies to all of its miles.
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
    duration_minutes: float


def _miles_at(segments: Sequence[Segment], level: RiskLevel) -> float:
    return sum(segment.miles for segment in segments if segment.risk == level)


def score_route(route_id: str, segments: Sequence[Segment], duration_minutes: float) -> RouteScore:
    if not segments:
        raise ValueError(f"Route {route_id} has no segments")
    if any(segment.miles < 0 for segment in segments):
        raise ValueError(f"Route {route_id} has a segment with negative miles")

    return RouteScore(
        route_id=route_id,
        severe_miles=_miles_at(segments, RiskLevel.SEVERE),
        high_miles=_miles_at(segments, RiskLevel.HIGH),
        duration_minutes=duration_minutes,
    )
