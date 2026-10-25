"""Hands that break the engine's assumptions. The engine keeps the default confusion model;
the simulated hand does something else.

    uv run --project engine python -m truehand.experiments.mismatch [--n N] [--seed S]

Scenarios (lopsided slips, 3-row jumps, bridging, poor contact) are described with their
parameters by ``describe_scenarios()``, built from the constants below.
"""

from __future__ import annotations

import argparse
import sys
from collections.abc import Sequence
from pathlib import Path

import numpy as np

from truehand.config import ConfusionSpec
from truehand.confusion import banded_confusion
from truehand.domains import get_model
from truehand.engine import Engine
from truehand.experiments.report import (
    ASSUMED_CONFUSION,
    DEFAULT_RESULTS_DIR,
    DEFINITIONS,
    arm_table,
    header_lines,
    provenance,
    write_results,
)
from truehand.experiments.runner import (
    ARM_NAMES,
    POOR_CONTACT_READING,
    HandModel,
    draw_truths,
    run_arms,
)
from truehand.model import FloatArray

MODULE = "truehand.experiments.mismatch"
DEFAULT_N = 300
DEFAULT_SEED = 1
LOPSIDED = {0: 0.78, -1: 0.14, 1: 0.02, -2: 0.03, 2: 0.03}
THREE_ROW_JUMP_P = 0.03
BRIDGE_P = 0.10
POOR_CONTACT_P = 0.05


def offset_confusion(mass_by_offset: dict[int, float], n_sites: int) -> FloatArray:
    """Row n puts ``mass_by_offset[d]`` on site n + d; off-board mass dropped, row renormalised."""
    matrix = np.zeros((n_sites, n_sites))
    for told in range(n_sites):
        for offset, mass in mass_by_offset.items():
            if 0 <= told + offset < n_sites:
                matrix[told, told + offset] = mass
        matrix[told] /= matrix[told].sum()
    return matrix


def _offset_words(offset: int) -> str:
    if offset == 0:
        return "on the told row"
    return f"{abs(offset)} row{'s' if abs(offset) > 1 else ''} {'down' if offset < 0 else 'up'}"


def describe_scenarios() -> str:
    lopsided = ", ".join(f"{mass:g} {_offset_words(offset)}" for offset, mass in LOPSIDED.items())
    return (
        f"*lopsided*: slips skewed one way ({lopsided}); "
        f"*three_row_jumps*: {THREE_ROW_JUMP_P:g} of the mass moved from the told row to three "
        f"rows away ({THREE_ROW_JUMP_P / 2:g} each side); "
        f"*bridging*: with probability {BRIDGE_P:g} the probe straddles the told row and a "
        "neighbour and reads their midpoint (a stated simplification); "
        f"*poor_contact*: with probability {POOR_CONTACT_P:g} the probe makes no contact and "
        f"reads {POOR_CONTACT_READING:g} V plus noise."
    )


def scenarios(engine: Engine) -> dict[str, HandModel]:
    n_sites = engine.n_sites
    default = engine.confusion
    spec = ConfusionSpec()
    jumps = ConfusionSpec(p_same=spec.p_same - THREE_ROW_JUMP_P, p_pm3=THREE_ROW_JUMP_P / 2)
    return {
        "lopsided": HandModel(offset_confusion(LOPSIDED, n_sites)),
        "three_row_jumps": HandModel(banded_confusion(jumps, n_sites)),
        "bridging": HandModel(default, bridge_p=BRIDGE_P),
        "poor_contact": HandModel(default, contact_fail_p=POOR_CONTACT_P),
    }


def parse(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog=f"python -m {MODULE}", description=__doc__)
    parser.add_argument("--n", type=int, default=DEFAULT_N)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_RESULTS_DIR)
    return parser.parse_args(list(argv))


def main(argv: Sequence[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    args = parse(argv)
    engine = Engine(get_model("circuit"))
    truths = draw_truths(engine.n_hypotheses, args.n, args.seed)
    results = {
        name: run_arms(ARM_NAMES, engine, hand, truths, args.seed)
        for name, hand in scenarios(engine).items()
    }
    payload = {
        **provenance("mismatch", MODULE, argv),
        "domain": "circuit",
        "seeds": [args.seed],
        "n": args.n,
        "engine_assumes": ASSUMED_CONFUSION,
        "scenario_descriptions": describe_scenarios(),
        "scenarios": results,
    }
    md = header_lines(payload, f"Model mismatch: {args.n} simulated faults per method per scenario")
    md.append(f"The engine always assumes the default confusion model ({ASSUMED_CONFUSION}).")
    md.append("")
    md.append(f"Scenarios: {describe_scenarios()}")
    for name, arms in results.items():
        md += ["", f"## {name}", "", *arm_table(arms)]
    md += DEFINITIONS
    write_results("mismatch", payload, md, args.out_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
