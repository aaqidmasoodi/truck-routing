from datetime import UTC, datetime, timedelta

import pytest

from routing.checkpoints import (
    Checkpoint,
    checkpoints_for_route,
    distances_along,
    place_checkpoints,
    point_at,
    schedule,
)
from routing.clients.routing import Route
from routing.polyline import Point

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


def miles(checkpoints: list[Checkpoint]) -> list[float]:
    return [round(checkpoint.mile, 1) for checkpoint in checkpoints]


def test_checkpoints_start_and_end_with_the_route() -> None:
    checkpoints = place_checkpoints(NORTH, spacing_miles=50)

    assert (checkpoints[0].latitude, checkpoints[0].longitude) == NORTH[0]
    assert (checkpoints[-1].latitude, checkpoints[-1].longitude) == NORTH[-1]


@pytest.mark.parametrize(
    ("spacing", "expected"),
    [
        (50, [0, 50, 100, 138.2]),
        (25, [0, 25, 50, 75, 100, 125, 138.2]),
        (200, [0, 138.2]),
    ],
)
def test_checkpoints_are_evenly_spaced(spacing: float, expected: list[float]) -> None:
    assert miles(place_checkpoints(NORTH, spacing)) == pytest.approx(expected, abs=0.2)


def test_route_length_on_a_spacing_mark_has_no_duplicate_end() -> None:
    along = distances_along(NORTH)

    checkpoints = place_checkpoints(NORTH, spacing_miles=along[-1] / 2)

    assert len(checkpoints) == 3


def test_zero_length_route_has_one_checkpoint() -> None:
    assert miles(place_checkpoints([(5.0, 5.0)], 25)) == [0]


@pytest.mark.parametrize(("points", "spacing"), [(NORTH, 0), (NORTH, -10), ([], 25)])
def test_bad_input_is_rejected(points: list[Point], spacing: float) -> None:
    with pytest.raises(ValueError):
        place_checkpoints(points, spacing)


def test_segments_add_up_to_the_whole_route() -> None:
    checkpoints = place_checkpoints(NORTH, spacing_miles=25)

    assert sum(c.segment_miles for c in checkpoints) == pytest.approx(checkpoints[-1].mile)


def test_inner_checkpoints_cover_half_of_each_side() -> None:
    first, second, *_ = place_checkpoints(NORTH, spacing_miles=25)

    assert first.segment_miles == pytest.approx(12.5)
    assert second.segment_miles == pytest.approx(25)


def test_miles_follow_the_road_distance_when_given() -> None:
    checkpoints = place_checkpoints(NORTH, spacing_miles=50, road_miles=150)

    assert miles(checkpoints) == [0, 50, 100, 150]
    # 100 of 150 road miles is two thirds of the way along the shape.
    assert checkpoints[2].latitude == pytest.approx(2 * 2 / 3, abs=0.01)


LEAVING = datetime(2026, 11, 9, 8, 0, tzinfo=UTC)


def test_eta_grows_with_distance_at_average_speed() -> None:
    checkpoints = place_checkpoints(NORTH, spacing_miles=50, road_miles=150)

    times = [c.eta for c in schedule(checkpoints, LEAVING, duration_minutes=180)]

    assert times == [
        LEAVING,
        LEAVING + timedelta(minutes=60),
        LEAVING + timedelta(minutes=120),
        LEAVING + timedelta(minutes=180),
    ]


def test_schedule_keeps_position_and_share() -> None:
    checkpoint = place_checkpoints(NORTH, spacing_miles=50)[1]

    scheduled = schedule([checkpoint], LEAVING, duration_minutes=60)[0]

    assert (scheduled.latitude, scheduled.mile) == (checkpoint.latitude, checkpoint.mile)
    assert scheduled.segment_miles == checkpoint.segment_miles


def test_zero_length_route_arrives_at_departure() -> None:
    checkpoints = place_checkpoints([(5.0, 5.0)], 25)

    assert schedule(checkpoints, LEAVING, duration_minutes=0)[0].eta == LEAVING


def test_nothing_to_schedule() -> None:
    assert schedule([], LEAVING, duration_minutes=10) == []


def test_route_checkpoints_use_road_miles_and_drive_time(
    caplog: pytest.LogCaptureFixture,
) -> None:
    route = Route("route-1", distance_miles=150, duration_minutes=180, points=NORTH)

    with caplog.at_level("DEBUG", logger="routing.checkpoints"):
        checkpoints = checkpoints_for_route(route, spacing_miles=50, departure=LEAVING)

    assert [c.mile for c in checkpoints] == [0, 50, 100, 150]
    assert checkpoints[-1].eta == LEAVING + timedelta(hours=3)
    assert "route-1: 4 checkpoints every 50 mi" in caplog.text
