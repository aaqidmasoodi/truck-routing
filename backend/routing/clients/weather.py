"""Hourly forecasts from Open-Meteo (https://open-meteo.com), free and keyless.

We ask for millimetres and centimetres and convert ourselves, so the units are never
in doubt: rain comes back in mm per hour and snowfall in cm per hour.
"""

from dataclasses import dataclass
from typing import Any

MM_PER_INCH = 25.4
CM_PER_INCH = 2.54


@dataclass(frozen=True)
class Forecast:
    """One location's hourly forecast. Index i of each list belongs to times[i]."""

    times: list[int]  # unix seconds, UTC
    wind_mph: list[float]
    rain_in_per_hr: list[float]
    snow_in_per_hr: list[float]


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
