"""Hands that break the engine's assumptions. The engine keeps the default confusion model;
the simulated hand does something else.

    uv run --project engine python -m plumbline.experiments.mismatch [--n N] [--seed S]

Scenarios: lopsided slips (0.78 same, 0.14 one row down, 0.02 one row up, 0.03 two rows each
way); 3-row jumps (0.03 of the mass moved from the told row to +/-3); bridging (p 0.10, the
probe straddles the told row and a neighbour and reads the midpoint, a stated simplification);
poor contact (p 0.05, reads 0 V).
"""

from __future__ import annotations

import argparse
import sys
from collections.abc import Sequence
from pathlib import Path

import numpy as np

from plumbline.config import ConfusionSpec
from plumbline.confusion import banded_confusion
from plumbline.domains import get_model
from plumbline.engine import Engine
from plumbline.experiments.report import (
    DEFAULT_RESULTS_DIR,
    DEFINITIONS,
    arm_table,
    header_lines,
    provenance,
    write_results,
)
from plumbline.experiments.runner import ARM_NAMES, HandModel, draw_truths, run_arms
from plumbline.model import FloatArray

MODULE = "plumbline.experiments.mismatch"
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
        "engine_assumes": "default confusion 0.78 / 0.08 / 0.03",
        "scenarios": results,
    }
    md = header_lines(payload, f"Model mismatch: {args.n} simulated faults per method per scenario")
    scenario_text = (__doc__ or "").split("Scenarios:")[1].strip()
    md.append(f"The engine always assumes the default confusion model. Scenarios: {scenario_text}")
    for name, arms in results.items():
        md += ["", f"## {name}", "", *arm_table(arms)]
    md += DEFINITIONS
    write_results("mismatch", payload, md, args.out_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
