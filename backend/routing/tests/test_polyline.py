import pytest

from routing.polyline import decode


def test_decodes_googles_documented_example() -> None:
    assert decode("_p~iF~ps|U_ulLnnqC_mqNvxq`@") == [
        (38.5, -120.2),
        (40.7, -120.95),
        (43.252, -126.453),
    ]


def test_decodes_six_digit_precision() -> None:
    assert decode("_izlhA~rlgdF", precision=6) == [(38.5, -120.2)]


def test_empty_string_is_no_points() -> None:
    assert decode("") == []


def test_truncated_polyline_is_rejected() -> None:
    with pytest.raises(ValueError):
        decode("_p~iF~ps|U_ulL")
