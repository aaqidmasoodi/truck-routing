import warnings

from django.core.cache.backends.base import BaseCache

from routing.clients.cache_keys import cache_key


def test_keys_are_safe_for_memcached() -> None:
    key = cache_key("places", "5:dublin, leinster, ireland")

    with warnings.catch_warnings():
        warnings.simplefilter("error")
        BaseCache({}).validate_key(key)


def test_same_text_gives_same_key() -> None:
    assert cache_key("places", "denver") == cache_key("places", "denver")
    assert cache_key("places", "denver") != cache_key("places", "chicago")
