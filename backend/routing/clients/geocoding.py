"""Turns place names into coordinates using the Open-Meteo geocoding API.

Location data is based on GeoNames: https://www.geonames.org
"""

import logging
from dataclasses import dataclass
from typing import Any

import httpx
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

CACHE_SECONDS = 24 * 60 * 60


class GeocodingError(Exception):
    """The geocoder couldn't be reached or sent back something we can't use."""


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
    key = f"places:{count}:{query.strip().lower()}"
    cached: list[Place] | None = cache.get(key)
    if cached is not None:
        logger.debug("geocode cache hit for %r (%d places)", query, len(cached))
        return cached

    if client is not None:
        places = _search(client, query, count)
    else:
        with httpx.Client(timeout=settings.HTTP_TIMEOUT_SECONDS) as http:
            places = _search(http, query, count)

    cache.set(key, places, CACHE_SECONDS)
    return places


def _search(http: httpx.Client, query: str, count: int) -> list[Place]:
    try:
        response = http.get(
            settings.GEOCODING_URL,
            params={"name": query, "count": count, "language": "en", "format": "json"},
        )
        response.raise_for_status()
        places = parse_places(response.json())
    except httpx.HTTPError as error:
        logger.warning("geocoding %r failed: %s", query, error)
        raise GeocodingError(f"Geocoding request failed: {error}") from error
    except (ValueError, KeyError, TypeError) as error:
        logger.warning("geocoding %r returned an unexpected response: %s", query, error)
        raise GeocodingError(f"Unexpected geocoding response: {error}") from error

    logger.debug("geocoded %r -> %s", query, [place.label for place in places])
    return places
