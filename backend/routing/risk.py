"""Weather risk levels for a single checkpoint.

Thresholds come straight from the assessment brief:

    Wind (mph)    Low < 25, Moderate 25-34, High 35-44, Severe 45-54, No Travel 55+
    Rain (in/hr)  Low < 0.10, Moderate 0.10-0.25, High 0.25-0.50, Severe 0.50-1.00, No Travel > 1.00
    Snow (in/hr)  Low < 0.5, Moderate 0.5-1.0, High 1.0-2.0, Severe 2.0-3.0, No Travel > 3.0

Where two bands share an edge (rain at 0.25, for example) the value goes into the
higher band, the same way wind works. The top of the Severe band is inclusive
because the brief only says "more than" for No Travel.

Heavier loads make wind worse:

    Wind 45-54 mph with more than 30,000 lb  -> No Travel
    Wind 35-44 mph with more than 40,000 lb  -> Severe

A checkpoint's overall risk is the worst of its wind, rain and snow levels.
"""

from dataclasses import dataclass
from enum import IntEnum


class RiskLevel(IntEnum):
    LOW = 0
    MODERATE = 1
    HIGH = 2
    SEVERE = 3
    NO_TRAVEL = 4

    @property
    def label(self) -> str:
        return self.name.replace("_", " ").title()


def _require_non_negative(value: float, name: str) -> None:
    if value < 0:
        raise ValueError(f"{name} can't be negative, got {value}")


def wind_risk(speed_mph: float) -> RiskLevel:
    _require_non_negative(speed_mph, "Wind speed")
    if speed_mph < 25:
        return RiskLevel.LOW
    if speed_mph < 35:
        return RiskLevel.MODERATE
    if speed_mph < 45:
        return RiskLevel.HIGH
    if speed_mph < 55:
        return RiskLevel.SEVERE
    return RiskLevel.NO_TRAVEL


def rain_risk(inches_per_hour: float) -> RiskLevel:
    _require_non_negative(inches_per_hour, "Rain rate")
    if inches_per_hour < 0.10:
        return RiskLevel.LOW
    if inches_per_hour < 0.25:
        return RiskLevel.MODERATE
    if inches_per_hour < 0.50:
        return RiskLevel.HIGH
    if inches_per_hour <= 1.00:
        return RiskLevel.SEVERE
    return RiskLevel.NO_TRAVEL


def snow_risk(inches_per_hour: float) -> RiskLevel:
    _require_non_negative(inches_per_hour, "Snow rate")
    if inches_per_hour < 0.5:
        return RiskLevel.LOW
    if inches_per_hour < 1.0:
        return RiskLevel.MODERATE
    if inches_per_hour < 2.0:
        return RiskLevel.HIGH
    if inches_per_hour <= 3.0:
        return RiskLevel.SEVERE
    return RiskLevel.NO_TRAVEL


def wind_risk_for_load(speed_mph: float, weight_lb: float) -> RiskLevel:
    _require_non_negative(weight_lb, "Load weight")
    level = wind_risk(speed_mph)
    if level == RiskLevel.SEVERE and weight_lb > 30_000:
        return RiskLevel.NO_TRAVEL
    if level == RiskLevel.HIGH and weight_lb > 40_000:
        return RiskLevel.SEVERE
    return level


@dataclass(frozen=True)
class Conditions:
    wind_mph: float
    rain_in_per_hr: float
    snow_in_per_hr: float


@dataclass(frozen=True)
class CheckpointRisk:
    wind: RiskLevel
    rain: RiskLevel
    snow: RiskLevel

    @property
    def level(self) -> RiskLevel:
        return max(self.wind, self.rain, self.snow)


def checkpoint_risk(conditions: Conditions, weight_lb: float) -> CheckpointRisk:
    return CheckpointRisk(
        wind=wind_risk_for_load(conditions.wind_mph, weight_lb),
        rain=rain_risk(conditions.rain_in_per_hr),
        snow=snow_risk(conditions.snow_in_per_hr),
    )
