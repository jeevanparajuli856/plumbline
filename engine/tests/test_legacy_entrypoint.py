from plumbline_api.main import app as legacy_app
from truehand_api.main import app


def test_the_dashboard_start_command_still_serves_the_same_app() -> None:
    assert legacy_app is app
