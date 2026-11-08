import pytest
from django.test import Client, override_settings

from config.settings import _vite_hashed


@pytest.fixture
def dist(tmp_path):
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<div id='root'></div>")
    (tmp_path / "assets" / "index-Dst1lCry.js").write_text("console.log(1)")
    return tmp_path


def test_serves_the_built_frontend_at_the_root(dist):
    with override_settings(WHITENOISE_ROOT=dist, WHITENOISE_INDEX_FILE=True):
        response = Client().get("/")

    assert response.status_code == 200
    assert b"root" in response.getvalue()


def test_caches_hashed_assets_for_good(dist):
    with override_settings(
        WHITENOISE_ROOT=dist,
        WHITENOISE_INDEX_FILE=True,
        WHITENOISE_IMMUTABLE_FILE_TEST=_vite_hashed,
    ):
        response = Client().get("/assets/index-Dst1lCry.js")

    assert response.status_code == 200
    assert "immutable" in response["Cache-Control"]


def test_api_still_wins_over_the_frontend(dist):
    with override_settings(WHITENOISE_ROOT=dist, WHITENOISE_INDEX_FILE=True):
        response = Client().get("/api/health/")

    assert response.json() == {"status": "ok"}


@pytest.mark.parametrize(
    ("url", "hashed"),
    [
        ("/assets/index-Dst1lCry.js", True),
        ("/assets/mui-BQHSqI65.js", True),
        ("/assets/roboto-flex-latin-wght-normal-n-dP9qr2.woff2", True),
        ("/index.html", False),
        ("/favicon.svg", False),
    ],
)
def test_knows_which_files_vite_hashed(url, hashed):
    assert _vite_hashed("", url) is hashed
