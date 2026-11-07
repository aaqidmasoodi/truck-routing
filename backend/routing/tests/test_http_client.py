from routing.clients.http import new_client


def test_requests_identify_the_app() -> None:
    with new_client() as client:
        assert client.headers["User-Agent"].startswith("truck-routing/")
