from typing import Any

import httpx
import pytest

from routing.clients.http import new_client


def test_requests_identify_the_app() -> None:
    with new_client() as client:
        assert client.headers["User-Agent"].startswith("truck-routing/")


def test_unreachable_servers_are_given_up_on_quickly() -> None:
    with new_client() as client:
        assert client.timeout.connect == 3


def test_dropped_connections_are_retried(monkeypatch: pytest.MonkeyPatch) -> None:
    made: list[int] = []
    real_transport = httpx.HTTPTransport

    def spy(**kwargs: Any) -> httpx.HTTPTransport:
        made.append(kwargs["retries"])
        return real_transport(**kwargs)

    monkeypatch.setattr(httpx, "HTTPTransport", spy)

    with new_client():
        pass

    assert made == [2]
