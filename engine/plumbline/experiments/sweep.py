"""Sweep the hand's P(lands on the told site) and compare plumbline with the published method.

    uv run --project engine python -m plumbline.experiments.sweep [--n N] [--points 0.6,...,1.0]

Off-site mass keeps the default 0.08 : 0.03 split between one and two rows away. Panel
*matched*: the engine assumes the true p_same. Panel *fixed*: the engine keeps 0.78.
"""

from __future__ import annotations

import argparse
import sys
from collections.abc import Sequence
from dataclasses import replace
from pathlib import Path
from typing import Any

from plumbline.config import CONFUSION_P_PM1, CONFUSION_P_PM2, ConfusionSpec, EngineConfig
from plumbline.domains import get_model
from plumbline.engine import Engine
from plumbline.experiments.report import (
    DEFAULT_RESULTS_DIR,
    DEFINITIONS,
    header_lines,
    pct,
    provenance,
    write_results,
)
from plumbline.experiments.runner import HandModel, draw_truths, run_arms

MODULE = "plumbline.experiments.sweep"
DEFAULT_N = 200
DEFAULT_SEED = 1
DEFAULT_POINTS = "0.6,0.65,0.7,0.75,0.8,0.85,0.9,0.95,1.0"
SWEEP_ARMS = ("plumbline", "entropy_exact")


def spec_for(p_same: float) -> ConfusionSpec:
    off_site = 1.0 - p_same
    one_row_share = CONFUSION_P_PM1 / (CONFUSION_P_PM1 + CONFUSION_P_PM2)
    return ConfusionSpec(
        p_same=p_same, p_pm1=off_site * one_row_share / 2, p_pm2=off_site * (1 - one_row_share) / 2
    )


def parse(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog=f"python -m {MODULE}", description=__doc__)
    parser.add_argument("--n", type=int, default=DEFAULT_N)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--points", default=DEFAULT_POINTS)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_RESULTS_DIR)
    return parser.parse_args(list(argv))


def main(argv: Sequence[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    args = parse(argv)
    model = get_model("circuit")
    fixed = Engine(model)
    truths = draw_truths(fixed.n_hypotheses, args.n, args.seed)
    panels: dict[str, list[dict[str, Any]]] = {"matched": [], "fixed": []}
    for p_same in (float(p) for p in args.points.split(",")):
        spec = spec_for(p_same)
        matched = Engine(model, replace(EngineConfig(), confusion=spec))
        hand = HandModel(matched.confusion)
        for panel, engine in (("matched", matched), ("fixed", fixed)):
            arms = run_arms(SWEEP_ARMS, engine, hand, truths, args.seed)
            panels[panel].append({"p_same": p_same, "arms": arms})
    payload = {
        **provenance("sweep", MODULE, argv),
        "domain": "circuit",
        "seeds": [args.seed],
        "n": args.n,
        "panels": panels,
    }
    md = header_lines(
        payload, f"Sweep over P(lands on told site), {args.n} simulated faults per point"
    )
    md.append((__doc__ or "").split("\n\n")[-1].strip())
    for panel, points in panels.items():
        md += [
            "",
            f"## {panel}",
            "",
            "| p_same | method | Correct % | Confidently wrong % | Mean steps |",
            "|---|---|---|---|---|",
        ]
        for point in points:
            for arm, m in point["arms"].items():
                md.append(
                    f"| {point['p_same']:.2f} | {arm} | {pct(m['correct_pct'])} | "
                    f"{pct(m['confidently_wrong_pct'])} | {m['mean_steps']:.2f} |"
                )
    md += DEFINITIONS
    write_results("sweep", payload, md, args.out_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
