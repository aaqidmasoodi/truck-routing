"""Puts the pieces together: route options, checkpoints, weather and risk."""

from collections.abc import Sequence
from dataclasses import dataclass

from .checkpoints import ScheduledCheckpoint
from .risk import CheckpointRisk, Conditions, checkpoint_risk


@dataclass(frozen=True)
class PlannedCheckpoint:
    checkpoint: ScheduledCheckpoint
    weather: Conditions | None
    risk: CheckpointRisk | None  # None when there's no forecast for the arrival time


def assess(
    checkpoints: Sequence[ScheduledCheckpoint],
    weather: Sequence[Conditions | None],
    weight_lb: float,
) -> list[PlannedCheckpoint]:
    """Risk at each checkpoint for the weather due when the truck gets there."""
    return [
        PlannedCheckpoint(
            checkpoint=checkpoint,
            weather=conditions,
            risk=checkpoint_risk(conditions, weight_lb) if conditions else None,
        )
        for checkpoint, conditions in zip(checkpoints, weather, strict=True)
    ]
