import pytest

from routing.clients.weather import parse_forecasts

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
