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
