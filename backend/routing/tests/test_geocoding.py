from collections.abc import Callable

import httpx

from routing.clients.geocoding import Place, parse_places, search_places

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
