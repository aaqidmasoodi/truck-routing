from typing import Any

import pytest

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
