"""Driving routes from an OSRM server (https://project-osrm.org).

Route data comes from OpenStreetMap, (c) OpenStreetMap contributors.
"""

from dataclasses import dataclass
from typing import Any

import httpx
from django.conf import settings

from ..polyline import Point, decode
from .http import new_client

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


def find_routes(
    origin: Point, destination: Point, client: httpx.Client | None = None
) -> list[Route]:
    """Up to three driving routes. OSRM only adds alternatives when it finds sensible ones."""
    if client is not None:
        return _fetch(client, origin, destination)
    with new_client() as http:
        return _fetch(http, origin, destination)


def _fetch(http: httpx.Client, origin: Point, destination: Point) -> list[Route]:
    # OSRM wants longitude first.
    coordinates = ";".join(f"{lon},{lat}" for lat, lon in (origin, destination))
    response = http.get(
        f"{settings.ROUTING_URL}/{coordinates}",
        params={"alternatives": 3, "overview": "full", "geometries": "polyline6", "steps": "false"},
    )
    response.raise_for_status()
    return parse_routes(response.json())
