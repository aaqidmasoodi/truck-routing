from collections.abc import Callable

import httpx
import pytest
from django.core.cache import cache

from routing.clients.geocoding import GeocodingError, Place, parse_places, search_places


@pytest.fixture(autouse=True)
def empty_cache() -> None:
    cache.clear()


DENVER = {
    "id": 5419384,
    "name": "Denver",
    "latitude": 39.73915,
    "longitude": -104.9847,
    "country": "United States",
    "admin1": "Colorado",
}


def test_parse_places_reads_the_fields_we_need() -> None:
    assert parse_places({"results": [DENVER]}) == [
        Place("Denver", "Colorado", "United States", 39.73915, -104.9847)
    ]


def test_no_matches_means_no_results_key() -> None:
    assert parse_places({"generationtime_ms": 0.4}) == []


def test_missing_region_is_left_out_of_the_label() -> None:
    no_region = {key: value for key, value in DENVER.items() if key != "admin1"}
    place = parse_places({"results": [no_region]})[0]

    assert place.label == "Denver, United States"


def test_label_joins_name_region_and_country() -> None:
    assert parse_places({"results": [DENVER]})[0].label == "Denver, Colorado, United States"


def fake_api(handler: Callable[[httpx.Request], httpx.Response]) -> httpx.Client:
    return httpx.Client(transport=httpx.MockTransport(handler))


def test_search_sends_the_query_and_returns_places() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json={"results": [DENVER]})

    places = search_places("Denv", count=3, client=fake_api(handler))

    assert [place.name for place in places] == ["Denver"]
    assert seen[0].url.params["name"] == "Denv"
    assert seen[0].url.params["count"] == "3"


def test_search_opens_its_own_client_when_none_is_given(monkeypatch: pytest.MonkeyPatch) -> None:
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json={}))
    real_client = httpx.Client
    monkeypatch.setattr(
        httpx, "Client", lambda **kwargs: real_client(transport=transport, **kwargs)
    )

    assert search_places("Nowhere") == []


@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(400, json={"error": True, "reason": "Parameter count must be 1-100"}),
        httpx.Response(503, text="down"),
        httpx.Response(200, text="not json"),
        httpx.Response(200, json={"results": [{"name": "No coordinates"}]}),
    ],
)
def test_bad_responses_raise_geocoding_error(response: httpx.Response) -> None:
    with pytest.raises(GeocodingError):
        search_places("Denver", client=fake_api(lambda request: response))


def test_network_failure_raises_geocoding_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("timed out", request=request)

    with pytest.raises(GeocodingError):
        search_places("Denver", client=fake_api(handler))


def test_repeat_searches_are_served_from_cache() -> None:
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(str(request.url))
        return httpx.Response(200, json={"results": [DENVER]})

    api = fake_api(handler)
    search_places("Denver", client=api)
    search_places("  denver ", client=api)

    assert len(calls) == 1


def test_failed_searches_are_not_cached() -> None:
    responses = iter([httpx.Response(503), httpx.Response(200, json={"results": [DENVER]})])
    api = fake_api(lambda request: next(responses))

    with pytest.raises(GeocodingError):
        search_places("Denver", client=api)

    assert search_places("Denver", client=api)[0].name == "Denver"


def test_lookups_and_cache_hits_are_logged(caplog: pytest.LogCaptureFixture) -> None:
    api = fake_api(lambda request: httpx.Response(200, json={"results": [DENVER]}))

    with caplog.at_level("DEBUG", logger="routing.clients.geocoding"):
        search_places("Denver", client=api)
        search_places("Denver", client=api)

    assert "geocoded 'Denver' -> ['Denver, Colorado, United States']" in caplog.text
    assert "geocode cache hit for 'Denver'" in caplog.text
