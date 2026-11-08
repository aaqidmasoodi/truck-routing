from django.test import Client
from django.urls import reverse


def test_schema_is_published(client: Client) -> None:
    response = client.get(reverse("schema"))

    assert response.status_code == 200
    assert b"Weather-Aware Truck Routing API" in response.content


def test_docs_page_loads(client: Client) -> None:
    assert client.get(reverse("docs")).status_code == 200
