import os
import secrets
import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2]


def manage(*args: str, **env: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "manage.py", *args],
        cwd=BACKEND,
        env={**os.environ, **env},
        capture_output=True,
        text=True,
        check=False,
    )


def test_production_settings_pass_the_deploy_checks():
    result = manage(
        "check",
        "--deploy",
        "--fail-level",
        "WARNING",
        DJANGO_DEBUG="0",
        DJANGO_SECRET_KEY=secrets.token_urlsafe(50),
        RENDER_EXTERNAL_HOSTNAME="truck-routing.onrender.com",
    )

    assert result.returncode == 0, result.stderr


def test_production_needs_a_secret_key():
    env = {k: v for k, v in os.environ.items() if k != "DJANGO_SECRET_KEY"}
    result = subprocess.run(
        [sys.executable, "manage.py", "check"],
        cwd=BACKEND,
        env={**env, "DJANGO_DEBUG": "0"},
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode != 0
    assert "Set DJANGO_SECRET_KEY" in result.stderr
