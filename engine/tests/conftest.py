import json
from pathlib import Path
from typing import Any

import pytest

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures" / "parity"
FIXTURE_NAMES = (
    "worked_example",
    "seed_1",
    "seed_2",
    "seed_3",
    "seed_4",
    "seed_5",
    "slip_heavy",
    "unresolved_pair",
    "thermometer_demo",
)


def load_fixture(name: str) -> dict[str, Any]:
    return json.loads((FIXTURES_DIR / f"{name}.json").read_text())


@pytest.fixture(scope="session")
def worked_example() -> dict[str, Any]:
    return load_fixture("worked_example")
