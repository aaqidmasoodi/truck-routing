import pytest

from routing.checkpoints import distances_along, point_at

# Straight north along the meridian: each degree is about 69.1 miles.
NORTH = [(0.0, 0.0), (1.0, 0.0), (2.0, 0.0)]


def test_distances_along_start_at_zero_and_add_up() -> None:
    along = distances_along(NORTH)

    assert along[0] == 0
    assert along[1] == pytest.approx(69.1, abs=0.1)
    assert along[2] == pytest.approx(138.2, abs=0.2)


def test_single_point_route_has_no_length() -> None:
    assert distances_along([(1.0, 1.0)]) == [0.0]


def test_point_at_interpolates_between_points() -> None:
    along = distances_along(NORTH)

    lat, lon = point_at(NORTH, along, along[1] / 2)

    assert lat == pytest.approx(0.5)
    assert lon == 0


def test_point_at_lands_exactly_on_a_point() -> None:
    along = distances_along(NORTH)

    assert point_at(NORTH, along, along[1]) == (1.0, 0.0)


def test_point_at_clamps_to_the_ends() -> None:
    along = distances_along(NORTH)

    assert point_at(NORTH, along, -5) == NORTH[0]
    assert point_at(NORTH, along, 9999) == NORTH[-1]


def test_repeated_points_do_not_divide_by_zero() -> None:
    route = [(0.0, 0.0), (0.0, 0.0), (1.0, 0.0)]
    along = distances_along(route)

    assert point_at(route, along, 10)[0] == pytest.approx(10 / along[-1])
