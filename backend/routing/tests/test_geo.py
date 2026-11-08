import pytest

from routing.geo import miles_between

DUBLIN = (53.3498, -6.2603)
GALWAY = (53.2707, -9.0568)


def test_same_point_is_zero_miles() -> None:
    assert miles_between(DUBLIN, DUBLIN) == 0


def test_dublin_to_galway_as_the_crow_flies() -> None:
    # About 115 mi in a straight line (the road is about 130).
    assert miles_between(DUBLIN, GALWAY) == pytest.approx(115, abs=2)


def test_one_degree_of_latitude_is_about_69_miles() -> None:
    assert miles_between((0, 0), (1, 0)) == pytest.approx(69.1, abs=0.1)


def test_distance_is_the_same_both_ways() -> None:
    assert miles_between(DUBLIN, GALWAY) == miles_between(GALWAY, DUBLIN)
