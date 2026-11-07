"""Hourly forecasts from Open-Meteo (https://open-meteo.com), free and keyless.

We ask for millimetres and centimetres and convert ourselves, so the units are never
in doubt: rain comes back in mm per hour and snowfall in cm per hour.
"""

from bisect import bisect_right
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from itertools import batched
from typing import Any

import httpx
from django.conf import settings
from django.core.cache import cache

from ..polyline import Point
from ..risk import Conditions
from .cache_keys import cache_key
from .http import new_client

MM_PER_INCH = 25.4
CM_PER_INCH = 2.54
HOUR = 3600
# Open-Meteo takes many locations per request; this keeps the URL a sensible length.
LOCATIONS_PER_REQUEST = 100
VARIABLES = "wind_speed_10m,rain,showers,snowfall"
# Departure can be up to 48 hours away and the drive can take two more days.
HORIZON_HOURS = 96
CACHE_SECONDS = 30 * 60


class WeatherError(Exception):
    """The forecast service couldn't be reached or sent back something we can't use."""


@dataclass(frozen=True)
class Forecast:
    """One location's hourly forecast. Index i of each list belongs to times[i]."""

    times: list[int]  # unix seconds, UTC
    wind_mph: list[float]
    rain_in_per_hr: list[float]
    snow_in_per_hr: list[float]

    def at(self, moment: datetime) -> Conditions | None:
        """Weather when the truck gets there, or None if that's outside the forecast.

        Rain and snow are totals for the hour *ending* at each timestamp, so the hour
        the truck is in is the first timestamp after it. Wind is a snapshot, so the
        nearest timestamp is used.
        """
        when = moment.timestamp()
        if not self.times or not self.times[0] - HOUR <= when <= self.times[-1]:
            return None

        precip = min(bisect_right(self.times, when), len(self.times) - 1)
        nearest = min(range(len(self.times)), key=lambda i: abs(self.times[i] - when))
        return Conditions(
            wind_mph=self.wind_mph[nearest],
            rain_in_per_hr=self.rain_in_per_hr[precip],
            snow_in_per_hr=self.snow_in_per_hr[precip],
        )


def _numbers(values: list[float | None]) -> list[float]:
    # Open-Meteo uses null for hours a model doesn't cover; treat them as calm.
    return [value or 0.0 for value in values]


def parse_forecasts(payload: dict[str, Any] | list[dict[str, Any]]) -> list[Forecast]:
    # One location comes back as an object, several as a list of objects.
    locations = payload if isinstance(payload, list) else [payload]
    forecasts = []
    for location in locations:
        hourly = location["hourly"]
        rain = [
            r + s
            for r, s in zip(_numbers(hourly["rain"]), _numbers(hourly["showers"]), strict=True)
        ]
        forecasts.append(
            Forecast(
                times=[int(t) for t in hourly["time"]],
                wind_mph=_numbers(hourly["wind_speed_10m"]),
                rain_in_per_hr=[mm / MM_PER_INCH for mm in rain],
                snow_in_per_hr=[cm / CM_PER_INCH for cm in _numbers(hourly["snowfall"])],
            )
        )
    return forecasts


def rounded(point: Point) -> Point:
    """About 1 km of rounding. The forecast grid is coarser than that anyway."""
    return (round(point[0], 2), round(point[1], 2))


def fetch_forecasts(points: Sequence[Point], client: httpx.Client | None = None) -> list[Forecast]:
    """Hourly forecasts for each point, in the same order, from this hour on.

    Nearby points share a forecast (see `rounded`), and anything fetched in the
    last half hour comes from the cache, so only new places are requested.
    """
    keys = {rounded(point): cache_key("forecast", f"{rounded(point)}") for point in points}
    known: dict[str, Forecast] = cache.get_many(list(keys.values()))
    missing = [place for place, key in keys.items() if key not in known]

    if missing:
        if client is not None:
            fresh = _fetch_all(client, missing)
        else:
            with new_client() as http:
                fresh = _fetch_all(http, missing)
        new = {keys[place]: forecast for place, forecast in zip(missing, fresh, strict=True)}
        cache.set_many(new, CACHE_SECONDS)
        known |= new

    return [known[keys[rounded(point)]] for point in points]


def _fetch_all(http: httpx.Client, points: Sequence[Point]) -> list[Forecast]:
    forecasts: list[Forecast] = []
    for chunk in batched(points, LOCATIONS_PER_REQUEST):
        try:
            response = http.get(
                settings.WEATHER_URL,
                params={
                    "latitude": ",".join(str(rounded(point)[0]) for point in chunk),
                    "longitude": ",".join(str(rounded(point)[1]) for point in chunk),
                    "hourly": VARIABLES,
                    "wind_speed_unit": "mph",
                    "timeformat": "unixtime",
                    "past_hours": 1,
                    "forecast_hours": HORIZON_HOURS,
                },
            )
            response.raise_for_status()
            found = parse_forecasts(response.json())
        except httpx.HTTPError as error:
            raise WeatherError(f"Forecast request failed: {error}") from error
        except (ValueError, KeyError, TypeError) as error:
            raise WeatherError(f"Unexpected forecast response: {error}") from error
        if len(found) != len(chunk):
            raise WeatherError(f"Asked for {len(chunk)} forecasts, got {len(found)}")
        forecasts.extend(found)
    return forecasts
