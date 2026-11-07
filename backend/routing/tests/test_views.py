from django.test import Client
from django.urls import reverse


def test_risk_levels_lists_every_level_in_order(client: Client) -> None:
    response = client.get(reverse("risk-levels"))

    assert response.status_code == 200
    assert response.json() == [
        {"value": 0, "label": "Low"},
        {"value": 1, "label": "Moderate"},
        {"value": 2, "label": "High"},
        {"value": 3, "label": "Severe"},
        {"value": 4, "label": "No Travel"},
    ]


def test_checkpoint_risk_scores_the_worst_condition(client: Client) -> None:
    response = client.post(
        reverse("checkpoint-risk"),
        {"wind_mph": 48, "rain_in_per_hr": 0.2, "snow_in_per_hr": 0, "weight_lb": 35_000},
        content_type="application/json",
    )

    assert response.status_code == 200
    body = response.json()
    assert body["level"] == {"value": 4, "label": "No Travel"}
    assert body["rain"] == {"value": 1, "label": "Moderate"}
    assert body["causes"] == ["wind"]


def test_checkpoint_risk_rejects_bad_input(client: Client) -> None:
    response = client.post(
        reverse("checkpoint-risk"),
        {"wind_mph": -5, "rain_in_per_hr": 0, "weight_lb": 20_000},
        content_type="application/json",
    )

    assert response.status_code == 400
    assert set(response.json()) == {"wind_mph", "snow_in_per_hr"}


def test_checkpoint_risk_only_accepts_post(client: Client) -> None:
    assert client.get(reverse("checkpoint-risk")).status_code == 405
