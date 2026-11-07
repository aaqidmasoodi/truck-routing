"""Turns place names into coordinates using the Open-Meteo geocoding API.

Location data is based on GeoNames: https://www.geonames.org
"""

from dataclasses import dataclass
from typing import Any

import httpx
from django.conf import settings


@dataclass(frozen=True)
class Place:
    name: str
    region: str
    country: str
    latitude: float
    longitude: float

    @property
    def label(self) -> str:
        return ", ".join(part for part in (self.name, self.region, self.country) if part)


def parse_places(payload: dict[str, Any]) -> list[Place]:
    # The API leaves "results" out entirely when nothing matches.
    return [
        Place(
            name=item["name"],
            region=item.get("admin1", ""),
            country=item.get("country", ""),
            latitude=float(item["latitude"]),
            longitude=float(item["longitude"]),
        )
        for item in payload.get("results", [])
    ]


def search_places(query: str, count: int = 5, client: httpx.Client | None = None) -> list[Place]:
    if client is not None:
        return _search(client, query, count)
    with httpx.Client(timeout=settings.HTTP_TIMEOUT_SECONDS) as http:
        return _search(http, query, count)


def _search(http: httpx.Client, query: str, count: int) -> list[Place]:
    response = http.get(
        settings.GEOCODING_URL,
        params={"name": query, "count": count, "language": "en", "format": "json"},
    )
    response.raise_for_status()
    return parse_places(response.json())
