from datetime import UTC, datetime

import pytest

from routing.clients.weather import Forecast, parse_forecasts

HOUR = 3600
START = 1_794_052_800  # 2026-11-07 12:00 UTC


def location(**hourly: list[float | None]) -> dict[str, object]:
    base: dict[str, list[float | None]] = {
        "time": [START, START + HOUR],
        "wind_speed_10m": [10.0, 20.0],
        "rain": [0.0, 2.54],
        "showers": [0.0, 2.54],
        "snowfall": [0.0, 0.0],
    }
    return {"latitude": 53.35, "longitude": -6.26, "hourly": base | hourly}


def test_single_location_is_an_object() -> None:
    forecast = parse_forecasts(location())[0]

    assert forecast.times == [START, START + HOUR]
    assert forecast.wind_mph == [10.0, 20.0]


def test_several_locations_are_a_list() -> None:
    assert len(parse_forecasts([location(), location()])) == 2


def test_rain_and_showers_add_up_in_inches() -> None:
    forecast = parse_forecasts(location())[0]

    assert forecast.rain_in_per_hr[1] == pytest.approx(0.2)


def test_snowfall_converts_from_centimetres() -> None:
    forecast = parse_forecasts(location(snowfall=[2.54, 7.62]))[0]

    assert forecast.snow_in_per_hr == pytest.approx([1.0, 3.0])


def test_missing_hours_count_as_calm() -> None:
    forecast = parse_forecasts(location(wind_speed_10m=[None, 5.0], rain=[None, 0.0]))[0]

    assert forecast.wind_mph == [0.0, 5.0]
    assert forecast.rain_in_per_hr[0] == 0


def at(seconds: int) -> datetime:
    return datetime.fromtimestamp(seconds, tz=UTC)


FORECAST = Forecast(
    times=[START, START + HOUR, START + 2 * HOUR],
    wind_mph=[10, 20, 30],
    rain_in_per_hr=[0.0, 0.1, 0.2],
    snow_in_per_hr=[0.0, 0.0, 1.0],
)


def test_rain_comes_from_the_hour_the_truck_is_in() -> None:
    # 12:20 is inside the hour ending 13:00.
    conditions = FORECAST.at(at(START + 20 * 60))

    assert conditions is not None
    assert conditions.rain_in_per_hr == 0.1


def test_on_the_hour_uses_the_hour_ahead() -> None:
    conditions = FORECAST.at(at(START + HOUR))

    assert conditions is not None
    assert (conditions.rain_in_per_hr, conditions.snow_in_per_hr) == (0.2, 1.0)


def test_wind_comes_from_the_nearest_hour() -> None:
    early = FORECAST.at(at(START + 20 * 60))
    late = FORECAST.at(at(START + 40 * 60))

    assert early is not None and late is not None
    assert (early.wind_mph, late.wind_mph) == (10, 20)


def test_last_hour_is_still_covered() -> None:
    conditions = FORECAST.at(at(START + 2 * HOUR))

    assert conditions is not None
    assert conditions.snow_in_per_hr == 1.0


@pytest.mark.parametrize("seconds", [START - 2 * HOUR, START + 3 * HOUR])
def test_outside_the_forecast_is_unknown(seconds: int) -> None:
    assert FORECAST.at(at(seconds)) is None


def test_empty_forecast_is_unknown() -> None:
    assert Forecast([], [], [], []).at(at(START)) is None
