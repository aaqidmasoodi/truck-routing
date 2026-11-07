"""Decoder for Google's encoded polyline format, which OSRM uses for route shapes.

Format: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
"""

Point = tuple[float, float]


def _read_value(encoded: str, index: int) -> tuple[int, int]:
    result = 0
    shift = 0
    while True:
        chunk = ord(encoded[index]) - 63
        index += 1
        result |= (chunk & 0x1F) << shift
        shift += 5
        if chunk < 0x20:
            break
    value = ~(result >> 1) if result & 1 else result >> 1
    return value, index


def decode(encoded: str, precision: int = 5) -> list[Point]:
    """Returns (latitude, longitude) pairs. OSRM's polyline6 needs precision=6."""
    factor = 10**precision
    points: list[Point] = []
    index = lat = lon = 0
    try:
        while index < len(encoded):
            lat_change, index = _read_value(encoded, index)
            lon_change, index = _read_value(encoded, index)
            lat += lat_change
            lon += lon_change
            points.append((lat / factor, lon / factor))
    except IndexError as error:
        raise ValueError("Polyline ends in the middle of a point") from error
    return points
