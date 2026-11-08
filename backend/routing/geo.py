"""Distances on the Earth's surface, good enough for spacing checkpoints."""

from math import asin, cos, radians, sin, sqrt

from .polyline import Point

EARTH_RADIUS_MILES = 3958.8


def miles_between(a: Point, b: Point) -> float:
    """Great-circle (haversine) distance in miles."""
    lat1, lon1, lat2, lon2 = map(radians, (*a, *b))
    h = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lon2 - lon1) / 2) ** 2
    return 2 * EARTH_RADIUS_MILES * asin(sqrt(h))
