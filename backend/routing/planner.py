"""Puts the pieces together: route options, checkpoints, weather and risk."""

import logging
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime

from .checkpoints import ScheduledCheckpoint, checkpoints_for_route
from .clients.routing import Route, find_routes
from .clients.weather import WeatherError, fetch_forecasts
from .polyline import Point
from .ranking import RouteScore, Segment, rank_routes, score_route, why_ahead
from .risk import CheckpointRisk, Conditions, RiskLevel, checkpoint_risk

logger = logging.getLogger(__name__)


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


def weather_at(checkpoints: Sequence[ScheduledCheckpoint]) -> list[Conditions | None]:
    """The forecast at each checkpoint's arrival time, in the same order.

    If the forecast service is down the routes are still worth showing, so every
    checkpoint just gets unknown weather.
    """
    try:
        forecasts = fetch_forecasts([(c.latitude, c.longitude) for c in checkpoints])
    except WeatherError:
        return [None] * len(checkpoints)
    return [
        forecast.at(checkpoint.eta)
        for checkpoint, forecast in zip(checkpoints, forecasts, strict=True)
    ]


def plan_trip(
    origin: Point,
    destination: Point,
    weight_lb: float,
    spacing_miles: float,
    departure: datetime,
) -> TripPlan:
    """Route options between two places, ranked safest first for this truck and time.

    Raises the routing client's errors if no route can be found.
    """
    routes = find_routes(origin, destination)
    per_route = [checkpoints_for_route(route, spacing_miles, departure) for route in routes]

    # One forecast lookup for every checkpoint on every route.
    weather = iter(weather_at([c for checkpoints in per_route for c in checkpoints]))
    planned = [
        plan_route(route, assess(checkpoints, [next(weather) for _ in checkpoints], weight_lb))
        for route, checkpoints in zip(routes, per_route, strict=True)
    ]
    plan = recommend(planned)
    logger.debug(
        "planned %d routes for %s lb: recommending %s (%s)%s",
        len(plan.routes),
        weight_lb,
        plan.routes[0].route.id,
        plan.reason,
        "" if plan.safe_to_travel else ", but every route has No Travel weather",
    )
    return plan
