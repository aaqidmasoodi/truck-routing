from datetime import timedelta
from typing import Any

import pytest
from django.utils import timezone

from routing.serializers import PlanRequest

TRIP = {
    "origin": {"latitude": 53.35, "longitude": -6.26},
    "destination": {"latitude": 53.27, "longitude": -9.06},
    "weight_lb": 36_000,
}


def test_a_full_trip_is_valid() -> None:
    form = PlanRequest(data=TRIP)

    assert form.is_valid(), form.errors
    assert form.validated_data["weight_lb"] == 36_000
    assert form.validated_data["spacing_miles"] == 25


@pytest.mark.parametrize(
    ("change", "field"),
    [
        ({"weight_lb": None}, "weight_lb"),
        ({"weight_lb": 0}, "weight_lb"),
        ({"weight_lb": 250_000}, "weight_lb"),
        ({"weight_lb": "heavy"}, "weight_lb"),
        ({"spacing_miles": 5}, "spacing_miles"),
        ({"destination": {"latitude": 53.35, "longitude": -6.26}}, "non_field_errors"),
    ],
)
def test_bad_trips_say_what_is_wrong(change: dict[str, Any], field: str) -> None:
    data = {key: value for key, value in {**TRIP, **change}.items() if value is not None}

    form = PlanRequest(data=data)

    assert not form.is_valid()
    assert field in form.errors


@pytest.mark.parametrize(
    "departure",
    ["not a date", "2020-01-01T08:00:00Z", "2999-01-01T08:00:00Z"],
)
def test_departure_must_be_soon(departure: str) -> None:
    form = PlanRequest(data={**TRIP, "departure": departure})

    assert not form.is_valid()
    assert "departure" in form.errors


def test_departure_in_the_next_two_days_is_fine() -> None:
    soon = timezone.now() + timedelta(hours=30)

    assert PlanRequest(data={**TRIP, "departure": soon.isoformat()}).is_valid()
