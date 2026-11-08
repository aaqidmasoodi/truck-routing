from datetime import timedelta
from typing import Any

from django.utils import timezone
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .checkpoints import SPACINGS_MILES
from .risk import RiskLevel

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


class PlanRequest(serializers.Serializer[Any]):
    origin = Coordinates()
    destination = Coordinates()
    weight_lb = serializers.FloatField(min_value=1, max_value=200_000)
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


class WeatherSerializer(serializers.Serializer[Any]):
    wind_mph = serializers.FloatField()
    rain_in_per_hr = serializers.FloatField()
    snow_in_per_hr = serializers.FloatField()


# Trip plan responses


@extend_schema_field(
    {
        "type": "object",
        "properties": {
            "value": {"type": "integer", "minimum": 0, "maximum": 4},
            "label": {"type": "string"},
        },
        "required": ["value", "label"],
    }
)
class RiskLevelField(serializers.Field[RiskLevel, Any, dict[str, Any], Any]):
    """A risk level as {"value": 3, "label": "Severe"}, so the UI needn't know the names."""

    def to_representation(self, value: RiskLevel) -> dict[str, Any]:
        return {"value": value.value, "label": value.label}


class RiskSerializer(serializers.Serializer[Any]):
    level = RiskLevelField()
    wind = RiskLevelField()
    rain = RiskLevelField()
    snow = RiskLevelField()
    causes = serializers.ListField(child=serializers.CharField())


class PlannedCheckpointSerializer(serializers.Serializer[Any]):
    latitude = serializers.FloatField(source="checkpoint.latitude")
    longitude = serializers.FloatField(source="checkpoint.longitude")
    mile = serializers.FloatField(source="checkpoint.mile")
    segment_miles = serializers.FloatField(source="checkpoint.segment_miles")
    eta = serializers.DateTimeField(source="checkpoint.eta")
    weather = WeatherSerializer(allow_null=True)
    risk = RiskSerializer(allow_null=True)


class RouteScoreSerializer(serializers.Serializer[Any]):
    no_travel_miles = serializers.FloatField()
    severe_miles = serializers.FloatField()
    high_miles = serializers.FloatField()
    average_risk = serializers.FloatField()


class PlannedRouteSerializer(serializers.Serializer[Any]):
    id = serializers.CharField(source="route.id")
    distance_miles = serializers.FloatField(source="route.distance_miles")
    duration_minutes = serializers.FloatField(source="route.duration_minutes")
    points = serializers.ListField(
        source="route.points", child=serializers.ListField(child=serializers.FloatField())
    )
    score = RouteScoreSerializer()
    unknown_weather_miles = serializers.FloatField(source="unknown_miles")
    checkpoints = PlannedCheckpointSerializer(many=True)


class TripPlanSerializer(serializers.Serializer[Any]):
    recommended_route_id = serializers.CharField(source="recommended.route.id")
    reason = serializers.CharField()
    safe_to_travel = serializers.BooleanField()
    routes = PlannedRouteSerializer(many=True)
