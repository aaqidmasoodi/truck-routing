"""Puts the pieces together: route options, checkpoints, weather and risk."""

from collections.abc import Sequence
from dataclasses import dataclass

from .checkpoints import ScheduledCheckpoint
from .clients.routing import Route
from .ranking import RouteScore, Segment, rank_routes, score_route, why_ahead
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


@dataclass(frozen=True)
class TripPlan:
    routes: list[PlannedRoute]  # safest first, so routes[0] is the recommendation
    reason: str  # why routes[0] is recommended
    # False when even the best route runs into No Travel weather.
    safe_to_travel: bool


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


def recommend(planned: Sequence[PlannedRoute]) -> TripPlan:
    if not planned:
        raise ValueError("Nothing to recommend without routes")

    by_id = {route.score.route_id: route for route in planned}
    ranked = [by_id[score.route_id] for score in rank_routes([p.score for p in planned])]
    best = ranked[0]
    reason = why_ahead(best.score, ranked[1].score) if len(ranked) > 1 else "The only route found"
    return TripPlan(
        routes=ranked,
        reason=reason,
        safe_to_travel=best.score.no_travel_miles == 0,
    )
