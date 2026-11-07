import hashlib


def cache_key(prefix: str, text: str) -> str:
    """Some cache backends reject spaces and long keys, so hash the variable part."""
    digest = hashlib.sha256(text.encode()).hexdigest()[:32]
    return f"{prefix}:{digest}"
