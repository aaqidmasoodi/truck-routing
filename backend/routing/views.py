import logging

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from .checkpoints import ScheduledCheckpoint, checkpoints_for_route
from .clients.geocoding import GeocodingError, search_places
from .clients.routing import NoRouteFound, RoutingError, find_routes
from .clients.weather import WeatherError, fetch_forecasts
from .risk import Conditions, RiskLevel, checkpoint_risk
from .serializers import (
    CheckpointRiskInput,
    CheckpointSerializer,
    PlaceQuery,
    PlaceSerializer,
    RouteRequest,
    RouteSerializer,
    WeatherSerializer,
)

logger = logging.getLogger(__name__)


@api_view(["GET"])
def health(request: Request) -> Response:
    return Response({"status": "ok"})


def _level(level: RiskLevel) -> dict[str, int | str]:
    return {"value": level.value, "label": level.label}


@api_view(["GET"])
def risk_levels(request: Request) -> Response:
    return Response([_level(level) for level in RiskLevel])


@api_view(["POST"])
def score_checkpoint(request: Request) -> Response:
    form = CheckpointRiskInput(data=request.data)
    if not form.is_valid():
        logger.info("rejected checkpoint request: %s", form.errors)
        return Response(form.errors, status=status.HTTP_400_BAD_REQUEST)
    data = form.validated_data

    risk = checkpoint_risk(
        Conditions(
            wind_mph=data["wind_mph"],
            rain_in_per_hr=data["rain_in_per_hr"],
            snow_in_per_hr=data["snow_in_per_hr"],
        ),
        weight_lb=data["weight_lb"],
    )
    return Response(
        {
            "level": _level(risk.level),
            "wind": _level(risk.wind),
            "rain": _level(risk.rain),
            "snow": _level(risk.snow),
            "causes": risk.causes,
        }
    )


@api_view(["GET"])
def places(request: Request) -> Response:
    form = PlaceQuery(data=request.query_params)
    if not form.is_valid():
        return Response(form.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        found = search_places(form.validated_data["q"])
    except GeocodingError:
        return Response(
            {"detail": "Place search is unavailable right now. Try again in a moment."},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    return Response(PlaceSerializer(found, many=True).data)


@api_view(["POST"])
def routes(request: Request) -> Response:
    form = RouteRequest(data=request.data)
    if not form.is_valid():
        logger.info("rejected route request: %s", form.errors)
        return Response(form.errors, status=status.HTTP_400_BAD_REQUEST)

    origin = form.validated_data["origin"]
    destination = form.validated_data["destination"]
    try:
        found = find_routes(
            (origin["latitude"], origin["longitude"]),
            (destination["latitude"], destination["longitude"]),
        )
    except NoRouteFound:
        return Response(
            {"detail": "There's no road route between these places."},
            status=status.HTTP_404_NOT_FOUND,
        )
    except RoutingError:
        return Response(
            {"detail": "Route planning is unavailable right now. Try again in a moment."},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    spacing = form.validated_data["spacing_miles"]
    departure = form.validated_data.get("departure") or timezone.now()
    per_route = [checkpoints_for_route(route, spacing, departure) for route in found]
    everywhere = [checkpoint for checkpoints in per_route for checkpoint in checkpoints]
    weather = iter(_weather_at(everywhere))

    body = []
    for route, checkpoints in zip(found, per_route, strict=True):
        rows = CheckpointSerializer(checkpoints, many=True).data
        for row in rows:
            conditions = next(weather)
            row["weather"] = WeatherSerializer(conditions).data if conditions else None
        body.append({**RouteSerializer(route).data, "checkpoints": rows})
    return Response(body)


def _weather_at(checkpoints: list[ScheduledCheckpoint]) -> list[Conditions | None]:
    """The forecast at each checkpoint's arrival time, in the same order.

    If the forecast service is down the routes are still worth showing, so every
    checkpoint just gets unknown weather.
    """
    try:
        forecasts = fetch_forecasts([(c.latitude, c.longitude) for c in checkpoints])
    except WeatherError:
        return [None] * len(checkpoints)
    return [
        forecast.at(checkpoint.eta)
        for checkpoint, forecast in zip(checkpoints, forecasts, strict=True)
    ]
