import httpx
from django.conf import settings


def new_client() -> httpx.Client:
    return httpx.Client(
        # Give up quickly on a server we can't reach, but let a slow answer finish.
        timeout=httpx.Timeout(settings.HTTP_TIMEOUT_SECONDS, connect=4),
        headers={"User-Agent": settings.HTTP_USER_AGENT},
    )
