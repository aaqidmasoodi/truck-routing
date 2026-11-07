from datetime import timedelta
from typing import Any

from django.utils import timezone
from rest_framework import serializers

from .checkpoints import SPACINGS_MILES

# Weather forecasts are only useful for about two days ahead.
FORECAST_HOURS = 48


class CheckpointRiskInput(serializers.Serializer[Any]):
    wind_mph = serializers.FloatField(min_value=0, max_value=250)
    rain_in_per_hr = serializers.FloatField(min_value=0, max_value=20)
    snow_in_per_hr = serializers.FloatField(min_value=0, max_value=20)
    weight_lb = serializers.FloatField(min_value=0, max_value=200_000)


class PlaceQuery(serializers.Serializer[Any]):
    q = serializers.CharField(min_length=2, max_length=100)


class PlaceSerializer(serializers.Serializer[Any]):
    name = serializers.CharField()
    region = serializers.CharField()
    country = serializers.CharField()
    display_name = serializers.CharField(source="label")
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()


class Coordinates(serializers.Serializer[Any]):
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)


class RouteRequest(serializers.Serializer[Any]):
    origin = Coordinates()
    destination = Coordinates()
    spacing_miles = serializers.ChoiceField(choices=SPACINGS_MILES, default=25)
    departure = serializers.DateTimeField(required=False)

    def validate_departure(self, value: Any) -> Any:
        now = timezone.now()
        if value < now - timedelta(hours=1):
            raise serializers.ValidationError("Departure can't be in the past.")
        if value > now + timedelta(hours=FORECAST_HOURS):
            raise serializers.ValidationError(
                f"Departure must be within the next {FORECAST_HOURS} hours."
            )
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if attrs["origin"] == attrs["destination"]:
            raise serializers.ValidationError("Start and destination are the same place.")
        return attrs


class RouteSerializer(serializers.Serializer[Any]):
    id = serializers.CharField()
    distance_miles = serializers.FloatField()
    duration_minutes = serializers.FloatField()
    points = serializers.ListField(child=serializers.ListField(child=serializers.FloatField()))


class CheckpointSerializer(serializers.Serializer[Any]):
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    mile = serializers.FloatField()
    segment_miles = serializers.FloatField()
    eta = serializers.DateTimeField()
