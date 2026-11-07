from routing.clients.http import new_client


def test_requests_identify_the_app() -> None:
    with new_client() as client:
        assert client.headers["User-Agent"].startswith("truck-routing/")


def test_unreachable_servers_are_given_up_on_quickly() -> None:
    with new_client() as client:
        assert client.timeout.connect == 4
