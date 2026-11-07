"""Checkpoints along a route, where the weather gets checked."""

from bisect import bisect_left
from collections.abc import Sequence
from itertools import accumulate, pairwise

from .geo import miles_between
from .polyline import Point


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
