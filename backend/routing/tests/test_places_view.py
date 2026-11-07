import pytest
from django.test import Client
from django.urls import reverse

from routing import views
from routing.clients.geocoding import GeocodingError, Place

DENVER = Place("Denver", "Colorado", "United States", 39.73915, -104.9847)


def test_places_returns_matches(client: Client, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(views, "search_places", lambda query: [DENVER])

    response = client.get(reverse("places"), {"q": "Denv"})

    assert response.status_code == 200
    assert response.json() == [
        {
            "name": "Denver",
            "region": "Colorado",
            "country": "United States",
            "display_name": "Denver, Colorado, United States",
            "latitude": 39.73915,
            "longitude": -104.9847,
        }
    ]


@pytest.mark.parametrize("params", [{}, {"q": "D"}, {"q": "x" * 101}])
def test_places_needs_a_sensible_query(client: Client, params: dict[str, str]) -> None:
    response = client.get(reverse("places"), params)

    assert response.status_code == 400
    assert "q" in response.json()


def test_places_reports_geocoder_outage(client: Client, monkeypatch: pytest.MonkeyPatch) -> None:
    def broken(query: str) -> list[Place]:
        raise GeocodingError("down")

    monkeypatch.setattr(views, "search_places", broken)

    response = client.get(reverse("places"), {"q": "Denver"})

    assert response.status_code == 502
    assert "unavailable" in response.json()["detail"]
