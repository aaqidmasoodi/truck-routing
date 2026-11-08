from io import StringIO
from pathlib import Path

from django.core.management import call_command

SCHEMA_FILE = Path(__file__).resolve().parents[2] / "openapi.yaml"


def test_committed_schema_matches_the_code() -> None:
    """The frontend's types are generated from openapi.yaml, so it must stay current.

    If this fails, run: python manage.py spectacular --file openapi.yaml
    """
    generated = StringIO()
    call_command("spectacular", "--validate", stdout=generated)

    assert SCHEMA_FILE.read_text() == generated.getvalue()
