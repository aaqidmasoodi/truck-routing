"""Turns place names into coordinates using the Open-Meteo geocoding API.

Location data is based on GeoNames: https://www.geonames.org
"""

from dataclasses import dataclass
from typing import Any


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
