"""Checkpoints along a route, where the weather gets checked."""

from bisect import bisect_left
from collections.abc import Sequence
from dataclasses import dataclass
from itertools import accumulate, pairwise
from math import ceil

from .geo import miles_between
from .polyline import Point

SPACINGS_MILES = (10, 25, 50)


@dataclass(frozen=True)
class Checkpoint:
    latitude: float
    longitude: float
    mile: float
    # Half the road to the previous checkpoint plus half to the next one, so the
    # checkpoints' shares add up to the whole route.
    segment_miles: float


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
    marks = [n * spacing_miles for n in range(count)] + [total]

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
