"""Record the nine parity fixtures into engine/fixtures/parity/ through ``Session`` only.

    uv run --project engine python -m plumbline.record_fixtures [--only a,b] [--out DIR] [--force]

Refuses to overwrite an existing file unless ``--force`` is given.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from collections.abc import Callable, Sequence
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from plumbline.config import ConfusionSpec
from plumbline.confusion import banded_confusion
from plumbline.domains import get_model
from plumbline.engine import Engine
from plumbline.fixture_io import fixture_from_session
from plumbline.session import ReplayScript, Session

COMMAND = "uv run --project engine python -m plumbline.record_fixtures"
DEFAULT_OUT = Path(__file__).resolve().parent.parent / "fixtures" / "parity"
SEED_FIXTURES = {f"seed_{i}": i for i in range(1, 6)}
SLIP_HEAVY_SEED = 3
SLIP_HEAVY_TRUTH = ConfusionSpec(p_same=0.40, p_pm1=0.20, p_pm2=0.10)
UNRESOLVED_PAIR_SEED = 1
WORKED_EXAMPLE = {
    "true_hypothesis": "R3_10x_low",
    "steps": [
        {"told_site": 2, "landed_site": 1, "reading": 3.671, "next_told_site": 2},
        {"told_site": 2, "landed_site": 2, "reading": 0.338, "next_told_site": None},
    ],
}
THERMOMETER_DEMO_FIRST_STEP = {"told_site": 5, "landed_site": 3, "reading": 65.65}
THERMOMETER_DEMO_TRUTH = "medium"


def _default_engine(domain: str) -> Engine:
    return Engine(get_model(domain))


def _replay(engine: Engine, script: dict[str, Any]) -> Session:
    session = Session(engine, mode="replay", seed=0, fixture=ReplayScript.from_mapping(script))
    while session.status == "continue" and session.instruction is not None:
        session.step(None)
    return session


def _scripted_then_obedient(engine: Engine, truth: str, first: dict[str, Any]) -> Session:
    """Scripted first step, then the hand lands where told and reads the noise-free value."""
    model = engine.model
    truth_index = model.hypothesis_index(truth)
    steps = [{**first, "next_told_site": None}]
    while True:
        session = _replay(engine, {"true_hypothesis": truth, "steps": steps})
        last = session.steps[-1]
        if last.resolution.status != "continue":
            return session
        site = last.engine_choice.site
        steps[-1] = {**steps[-1], "next_told_site": site}
        reading = round(model.expected_reading(truth_index, site), model.reading.decimals)
        steps.append(
            {"told_site": site, "landed_site": site, "reading": reading, "next_told_site": None}
        )


def _simulated(engine: Engine, seed: int, **kwargs: Any) -> Session:
    return Session(engine, mode="simulate", seed=seed, **kwargs)


def _slip_heavy() -> Session:
    engine = _default_engine("circuit")
    truth = banded_confusion(SLIP_HEAVY_TRUTH, engine.n_sites)
    return _simulated(engine, SLIP_HEAVY_SEED, truth_confusion=truth)


BUILDERS: dict[str, Callable[[], Session]] = {
    "worked_example": lambda: _replay(_default_engine("circuit"), WORKED_EXAMPLE),
    **{
        name: (lambda seed=seed: _simulated(_default_engine("circuit"), seed))
        for name, seed in SEED_FIXTURES.items()
    },
    "slip_heavy": _slip_heavy,
    "unresolved_pair": lambda: _simulated(
        _default_engine("circuit"), UNRESOLVED_PAIR_SEED, true_hypothesis="LED_reversed"
    ),
    "thermometer_demo": lambda: _scripted_then_obedient(
        _default_engine("thermometer"), THERMOMETER_DEMO_TRUTH, THERMOMETER_DEMO_FIRST_STEP
    ),
}


def build_session(name: str) -> Session:
    """The session for ``name``, run to its terminal step."""
    session = BUILDERS[name]()
    while session.status == "continue" and session.instruction is not None:
        session.step(None)
    return session


def git_sha() -> str:
    try:
        sha = subprocess.run(
            ["git", "rev-parse", "HEAD"], capture_output=True, text=True, check=True
        ).stdout.strip()
        dirty = subprocess.run(
            ["git", "status", "--porcelain", "--", str(Path(__file__).resolve().parent)],
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return "unknown"
    return f"{sha}-dirty" if dirty else sha


def _parse(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="python -m plumbline.record_fixtures", description=__doc__
    )
    parser.add_argument("--only", help="comma-separated fixture names", default=",".join(BUILDERS))
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--force", action="store_true", help="overwrite existing files")
    args = parser.parse_args(list(argv))
    names = [n.strip() for n in args.only.split(",") if n.strip()]
    unknown = sorted(set(names) - set(BUILDERS))
    if unknown:
        parser.error(f"unknown fixture(s): {', '.join(unknown)}")
    args.names = names
    return args


def main(argv: Sequence[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    args = _parse(argv)
    targets = {name: args.out / f"{name}.json" for name in args.names}
    existing = [str(path) for path in targets.values() if path.exists()]
    if existing and not args.force:
        sys.stderr.write(f"refusing to overwrite without --force: {', '.join(existing)}\n")
        return 1
    args.out.mkdir(parents=True, exist_ok=True)
    generated_by = " ".join([COMMAND, *argv])
    sha = git_sha()
    generated_at = datetime.now(UTC).isoformat(timespec="seconds")
    for name, path in targets.items():
        fixture = fixture_from_session(build_session(name), name, generated_by, sha, generated_at)
        path.write_text(json.dumps(fixture, indent=1, allow_nan=False) + "\n")
        sys.stderr.write(f"wrote {path}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
