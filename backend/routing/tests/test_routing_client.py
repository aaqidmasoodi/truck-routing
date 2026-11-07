import pytest

from routing.clients.routing import parse_routes

# Two tiny routes in the shape OSRM returns them (geometries=polyline6).
OSRM_RESPONSE = {
    "code": "Ok",
    "routes": [
        {"distance": 160934.4, "duration": 5400, "geometry": "_izlhA~rlgdF_qo]~po]"},
        {"distance": 177027.84, "duration": 6300, "geometry": "_izlhA~rlgdF"},
    ],
    "waypoints": [],
}


def test_parse_routes_converts_units() -> None:
    first = parse_routes(OSRM_RESPONSE)[0]

    assert first.distance_miles == pytest.approx(100)
    assert first.duration_minutes == 90


def test_parse_routes_decodes_the_shape() -> None:
    assert parse_routes(OSRM_RESPONSE)[0].points == [(38.5, -120.2), (39.0, -120.7)]


def test_routes_get_ids_in_order() -> None:
    assert [route.id for route in parse_routes(OSRM_RESPONSE)] == ["route-1", "route-2"]
