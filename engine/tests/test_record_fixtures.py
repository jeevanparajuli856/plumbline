import json
from pathlib import Path

import pytest

from truehand.record_fixtures import main


def test_records_only_the_named_fixture(tmp_path: Path) -> None:
    assert main(["--only", "worked_example", "--out", str(tmp_path)]) == 0
    files = sorted(p.name for p in tmp_path.iterdir())
    assert files == ["worked_example.json"]
    written = json.loads((tmp_path / "worked_example.json").read_text())
    assert "--only worked_example" in written["generated_by"]


def test_refuses_to_overwrite_without_force(tmp_path: Path) -> None:
    target = tmp_path / "worked_example.json"
    target.write_text("{}")
    assert main(["--only", "worked_example", "--out", str(tmp_path)]) == 1
    assert target.read_text() == "{}"
    assert main(["--only", "worked_example", "--out", str(tmp_path), "--force"]) == 0
    assert json.loads(target.read_text())["name"] == "worked_example"


def test_unknown_fixture_name_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(SystemExit):
        main(["--only", "nope", "--out", str(tmp_path)])
