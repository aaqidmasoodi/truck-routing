"""Checkpoints along a route, where the weather gets checked."""

import logging
from bisect import bisect_left
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from itertools import accumulate, pairwise
from math import ceil

from .clients.routing import Route
from .geo import miles_between
from .polyline import Point

logger = logging.getLogger(__name__)

SPACINGS_MILES = (10, 25, 50)


@dataclass(frozen=True)
class Checkpoint:
    latitude: float
    longitude: float
    mile: float
    # Half the road to the previous checkpoint plus half to the next one, so the
    # checkpoints' shares add up to the whole route.
    segment_miles: float


@dataclass(frozen=True)
class ScheduledCheckpoint(Checkpoint):
    eta: datetime


def distances_along(points: Sequence[Point]) -> list[float]:
    """Miles from the start of the route to each point."""
    steps = (miles_between(a, b) for a, b in pairwise(points))
    return list(accumulate(steps, initial=0.0))


def point_at(points: Sequence[Point], along: Sequence[float], miles: float) -> Point:
    """The spot `miles` into the route, between the two nearest points."""
    if miles <= 0:
        return points[0]
    if miles >= along[-1]:
        return points[-1]

    after = bisect_left(along, miles)
    before = after - 1
    gap = along[after] - along[before]
    share = (miles - along[before]) / gap if gap else 0
    (lat1, lon1), (lat2, lon2) = points[before], points[after]
    return (lat1 + (lat2 - lat1) * share, lon1 + (lon2 - lon1) * share)


def place_checkpoints(
    points: Sequence[Point], spacing_miles: float, road_miles: float | None = None
) -> list[Checkpoint]:
    """A checkpoint at the start, every `spacing_miles` after that, and one at the end.

    If the last spacing mark falls very close to the destination, the destination
    takes its place.

    The decoded shape is a little shorter than the real road (it cuts corners), so
    when the routing service's own distance is given, miles are measured in that.
    """
    if spacing_miles <= 0:
        raise ValueError(f"Spacing must be positive, got {spacing_miles}")
    if not points:
        raise ValueError("A route needs at least one point")

    along = distances_along(points)
    shape_total = along[-1]
    total = shape_total if road_miles is None else road_miles
    to_shape = shape_total / total if total else 1.0

    count = ceil(total / spacing_miles - 1e-9)
    marks = [n * spacing_miles for n in range(count)]
    # A mark a few hundred yards before the destination tells you nothing new.
    if len(marks) > 1 and total - marks[-1] < spacing_miles / 4:
        marks.pop()
    marks.append(total)

    checkpoints = []
    for index, mile in enumerate(marks):
        previous = marks[index - 1] if index > 0 else mile
        following = marks[index + 1] if index < len(marks) - 1 else mile
        lat, lon = point_at(points, along, mile * to_shape)
        checkpoints.append(
            Checkpoint(
                latitude=lat,
                longitude=lon,
                mile=mile,
                segment_miles=(following - previous) / 2,
            )
        )
    return checkpoints


def schedule(
    checkpoints: Sequence[Checkpoint], departure: datetime, duration_minutes: float
) -> list[ScheduledCheckpoint]:
    """Arrival time at each checkpoint, assuming the route's average speed throughout.

    Real trucks slow down in towns and speed up on motorways, but the routing service
    only gives a total time, and this keeps the error spread evenly instead of piling up.
    """
    total = checkpoints[-1].mile if checkpoints else 0
    scheduled = []
    for checkpoint in checkpoints:
        share = checkpoint.mile / total if total else 0
        scheduled.append(
            ScheduledCheckpoint(
                latitude=checkpoint.latitude,
                longitude=checkpoint.longitude,
                mile=checkpoint.mile,
                segment_miles=checkpoint.segment_miles,
                eta=departure + timedelta(minutes=duration_minutes * share),
            )
        )
    return scheduled


def checkpoints_for_route(
    route: Route, spacing_miles: float, departure: datetime
) -> list[ScheduledCheckpoint]:
    placed = place_checkpoints(route.points, spacing_miles, road_miles=route.distance_miles)
    scheduled = schedule(placed, departure, route.duration_minutes)
    logger.debug(
        "%s: %d checkpoints every %s mi, leaving %s, arriving %s",
        route.id,
        len(scheduled),
        spacing_miles,
        departure.isoformat(),
        scheduled[-1].eta.isoformat(),
    )
    return scheduled
