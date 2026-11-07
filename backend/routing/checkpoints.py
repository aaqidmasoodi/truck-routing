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


def place_checkpoints(points: Sequence[Point], spacing_miles: float) -> list[Checkpoint]:
    """A checkpoint at the start, every `spacing_miles` after that, and one at the end."""
    if spacing_miles <= 0:
        raise ValueError(f"Spacing must be positive, got {spacing_miles}")
    if not points:
        raise ValueError("A route needs at least one point")

    along = distances_along(points)
    total = along[-1]
    marks = [n * spacing_miles for n in range(ceil(total / spacing_miles))] + [total]

    checkpoints = []
    for mile in marks:
        lat, lon = point_at(points, along, mile)
        checkpoints.append(Checkpoint(latitude=lat, longitude=lon, mile=mile))
    return checkpoints
