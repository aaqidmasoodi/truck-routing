"""Driving routes from an OSRM server (https://project-osrm.org).

Route data comes from OpenStreetMap, (c) OpenStreetMap contributors.
"""

from dataclasses import dataclass
from typing import Any

from ..polyline import Point, decode

METERS_PER_MILE = 1609.344


@dataclass(frozen=True)
class Route:
    id: str
    distance_miles: float
    duration_minutes: float
    points: list[Point]


def parse_routes(payload: dict[str, Any]) -> list[Route]:
    return [
        Route(
            id=f"route-{number}",
            distance_miles=item["distance"] / METERS_PER_MILE,
            duration_minutes=item["duration"] / 60,
            points=decode(item["geometry"], precision=6),
        )
        for number, item in enumerate(payload["routes"], start=1)
    ]
