from collections.abc import Callable
from datetime import UTC, datetime

import httpx
import pytest
from django.core.cache import cache

from routing.clients.weather import Forecast, WeatherError, fetch_forecasts, parse_forecasts

HOUR = 3600
START = 1_794_052_800  # 2026-11-07 12:00 UTC


@pytest.fixture(autouse=True)
def empty_cache() -> None:
    cache.clear()


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


def fake_api(handler: Callable[[httpx.Request], httpx.Response]) -> httpx.Client:
    return httpx.Client(transport=httpx.MockTransport(handler))


def echo_locations(request: httpx.Request) -> httpx.Response:
    """Answer like Open-Meteo: one forecast per requested latitude."""
    count = len(request.url.params["latitude"].split(","))
    body = [location() for _ in range(count)]
    return httpx.Response(200, json=body[0] if count == 1 else body)


def test_fetch_asks_for_all_points_in_one_request() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return echo_locations(request)

    forecasts = fetch_forecasts([(53.3498, -6.2603), (53.2707, -9.0568)], client=fake_api(handler))

    assert len(forecasts) == 2
    assert len(seen) == 1
    params = seen[0].url.params
    assert params["latitude"] == "53.35,53.27"
    assert params["longitude"] == "-6.26,-9.06"
    assert params["wind_speed_unit"] == "mph"
    assert params["forecast_hours"] == "96"


def test_many_points_are_split_into_batches() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return echo_locations(request)

    points = [(50 + i / 100, -6.0) for i in range(250)]
    forecasts = fetch_forecasts(points, client=fake_api(handler))

    assert len(forecasts) == 250
    assert [len(r.url.params["latitude"].split(",")) for r in seen] == [100, 100, 50]


def test_fetch_opens_its_own_client(monkeypatch: pytest.MonkeyPatch) -> None:
    transport = httpx.MockTransport(echo_locations)
    real_client = httpx.Client
    monkeypatch.setattr(
        httpx, "Client", lambda **kwargs: real_client(**{**kwargs, "transport": transport})
    )

    assert len(fetch_forecasts([(53.35, -6.26)])) == 1


@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(400, json={"error": True, "reason": "Latitude must be in range"}),
        httpx.Response(503, text="busy"),
        httpx.Response(200, text="not json"),
        httpx.Response(200, json={"latitude": 1}),
        httpx.Response(200, json=[location()]),
    ],
)
def test_bad_responses_raise_weather_error(response: httpx.Response) -> None:
    with pytest.raises(WeatherError):
        fetch_forecasts([(53.35, -6.26), (53.27, -9.06)], client=fake_api(lambda r: response))


def test_network_failure_raises_weather_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("no answer", request=request)

    with pytest.raises(WeatherError):
        fetch_forecasts([(53.35, -6.26)], client=fake_api(handler))


def counting_api(calls: list[int]) -> httpx.Client:
    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(len(request.url.params["latitude"].split(",")))
        return echo_locations(request)

    return fake_api(handler)


def test_repeat_lookups_come_from_the_cache() -> None:
    calls: list[int] = []
    api = counting_api(calls)

    fetch_forecasts([(53.35, -6.26), (53.27, -9.06)], client=api)
    fetch_forecasts([(53.35, -6.26), (53.27, -9.06)], client=api)

    assert calls == [2]


def test_only_new_places_are_fetched() -> None:
    calls: list[int] = []
    api = counting_api(calls)

    fetch_forecasts([(53.35, -6.26)], client=api)
    forecasts = fetch_forecasts([(53.35, -6.26), (53.27, -9.06)], client=api)

    assert calls == [1, 1]
    assert len(forecasts) == 2


def test_nearby_points_share_one_forecast() -> None:
    calls: list[int] = []

    forecasts = fetch_forecasts(
        [(53.3501, -6.2601), (53.3502, -6.2599)], client=counting_api(calls)
    )

    assert calls == [1]
    assert forecasts[0] is forecasts[1]


def test_lookups_are_logged(caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level("DEBUG", logger="routing.clients.weather"):
        fetch_forecasts([(53.35, -6.26)] * 3, client=fake_api(echo_locations))

    assert "forecasts for 3 points: 1 places, 0 cached, 1 to fetch" in caplog.text


@pytest.mark.parametrize(
    ("minutes", "wind"),
    [(-30, 10), (0, 10), (29, 10), (31, 20), (60, 20), (119, 30), (120, 30)],
)
def test_wind_always_uses_the_closest_hour(minutes: int, wind: float) -> None:
    conditions = FORECAST.at(at(START + minutes * 60))

    assert conditions is not None
    assert conditions.wind_mph == wind
