import logging

from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from .clients.geocoding import GeocodingError, search_places
from .clients.routing import NoRouteFound, RoutingError
from .planner import plan_trip
from .risk import Conditions, RiskLevel, checkpoint_risk
from .serializers import (
    RISK_LEVEL_SCHEMA,
    CheckpointRiskInput,
    ErrorSerializer,
    HealthSerializer,
    PlaceQuery,
    PlaceSerializer,
    PlanRequest,
    RiskLevelField,
    RiskSerializer,
    TripPlanSerializer,
)

logger = logging.getLogger(__name__)

# Field-by-field validation messages, e.g. {"weight_lb": ["This field is required."]}.
INVALID = OpenApiResponse(OpenApiTypes.OBJECT, description="Invalid input, by field")


@extend_schema(responses=HealthSerializer)
@api_view(["GET"])
def health(request: Request) -> Response:
    return Response({"status": "ok"})


@extend_schema(responses={200: {"type": "array", "items": RISK_LEVEL_SCHEMA}})
@api_view(["GET"])
def risk_levels(request: Request) -> Response:
    field = RiskLevelField()
    return Response([field.to_representation(level) for level in RiskLevel])


@extend_schema(request=CheckpointRiskInput, responses={200: RiskSerializer, 400: INVALID})
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
    return Response(RiskSerializer(risk).data)


@extend_schema(
    parameters=[PlaceQuery],
    responses={200: PlaceSerializer(many=True), 400: INVALID, 502: ErrorSerializer},
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


@extend_schema(
    request=PlanRequest,
    responses={
        200: TripPlanSerializer,
        400: INVALID,
        404: OpenApiResponse(ErrorSerializer, description="No road between the places"),
        502: OpenApiResponse(ErrorSerializer, description="Routing service unavailable"),
    },
)
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
