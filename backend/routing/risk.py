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
