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
