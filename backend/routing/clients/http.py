import httpx
from django.conf import settings

# The free routing server sometimes ignores a new connection, then answers the next
# one straight away, so a dropped connection is retried before we give up.
CONNECT_RETRIES = 2


def new_client() -> httpx.Client:
    return httpx.Client(
        # Give up quickly on a connection that isn't happening, but let a slow answer finish.
        timeout=httpx.Timeout(settings.HTTP_TIMEOUT_SECONDS, connect=3),
        headers={"User-Agent": settings.HTTP_USER_AGENT},
        transport=httpx.HTTPTransport(retries=CONNECT_RETRIES),
    )
