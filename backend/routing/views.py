from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from .risk import RiskLevel


@api_view(["GET"])
def health(request: Request) -> Response:
    return Response({"status": "ok"})


@api_view(["GET"])
def risk_levels(request: Request) -> Response:
    return Response([{"value": level.value, "label": level.label} for level in RiskLevel])
