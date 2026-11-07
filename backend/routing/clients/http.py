import httpx
from django.conf import settings


def new_client() -> httpx.Client:
    return httpx.Client(
        timeout=settings.HTTP_TIMEOUT_SECONDS,
        headers={"User-Agent": settings.HTTP_USER_AGENT},
    )
