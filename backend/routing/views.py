import logging

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from .clients.geocoding import GeocodingError, search_places
from .clients.routing import NoRouteFound, RoutingError
from .planner import plan_trip
from .risk import Conditions, RiskLevel, checkpoint_risk
from .serializers import (
    CheckpointRiskInput,
    PlaceQuery,
    PlaceSerializer,
    PlanRequest,
    TripPlanSerializer,
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
def plan(request: Request) -> Response:
    """Route options for a truck trip, ranked safest first with the weather on the way."""
    form = PlanRequest(data=request.data)
    if not form.is_valid():
        logger.info("rejected plan request: %s", form.errors)
        return Response(form.errors, status=status.HTTP_400_BAD_REQUEST)

    data = form.validated_data
    try:
        trip = plan_trip(
            origin=(data["origin"]["latitude"], data["origin"]["longitude"]),
            destination=(data["destination"]["latitude"], data["destination"]["longitude"]),
            weight_lb=data["weight_lb"],
            spacing_miles=data["spacing_miles"],
            departure=data.get("departure") or timezone.now(),
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
    return Response(TripPlanSerializer(trip).data)
