from typing import Any

from rest_framework import serializers


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
