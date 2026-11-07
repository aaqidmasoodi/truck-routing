from typing import Any

from rest_framework import serializers


class CheckpointRiskInput(serializers.Serializer[Any]):
    wind_mph = serializers.FloatField(min_value=0, max_value=250)
    rain_in_per_hr = serializers.FloatField(min_value=0, max_value=20)
    snow_in_per_hr = serializers.FloatField(min_value=0, max_value=20)
    weight_lb = serializers.FloatField(min_value=0, max_value=200_000)
