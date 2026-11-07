"""Puts the pieces together: route options, checkpoints, weather and risk."""

from collections.abc import Sequence
from dataclasses import dataclass

from .checkpoints import ScheduledCheckpoint
from .clients.routing import Route
from .ranking import RouteScore, Segment, score_route
from .risk import CheckpointRisk, Conditions, RiskLevel, checkpoint_risk


@dataclass(frozen=True)
class PlannedCheckpoint:
    checkpoint: ScheduledCheckpoint
    weather: Conditions | None
    risk: CheckpointRisk | None  # None when there's no forecast for the arrival time


@dataclass(frozen=True)
class PlannedRoute:
    route: Route
    checkpoints: list[PlannedCheckpoint]
    score: RouteScore
    # Road with no forecast for the arrival time. It counts as Low when ranking, so
    # a forecast outage falls back to the fastest route, but the UI can warn about it.
    unknown_miles: float


def assess(
    checkpoints: Sequence[ScheduledCheckpoint],
    weather: Sequence[Conditions | None],
    weight_lb: float,
) -> list[PlannedCheckpoint]:
    """Risk at each checkpoint for the weather due when the truck gets there."""
    return [
        PlannedCheckpoint(
            checkpoint=checkpoint,
            weather=conditions,
            risk=checkpoint_risk(conditions, weight_lb) if conditions else None,
        )
        for checkpoint, conditions in zip(checkpoints, weather, strict=True)
    ]


def plan_route(route: Route, checkpoints: list[PlannedCheckpoint]) -> PlannedRoute:
    segments = [
        Segment(
            planned.checkpoint.segment_miles, planned.risk.level if planned.risk else RiskLevel.LOW
        )
        for planned in checkpoints
    ]
    unknown = sum(p.checkpoint.segment_miles for p in checkpoints if p.risk is None)
    return PlannedRoute(
        route=route,
        checkpoints=checkpoints,
        score=score_route(route.id, segments, route.duration_minutes),
        unknown_miles=unknown,
    )
