"""Run the experiment over several seeds and report mean and standard deviation per method.

uv run --project engine python -m truehand.experiments.stability [--n N] [--seeds 1,2,3,4,5]
"""

from __future__ import annotations

import argparse
import sys
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import numpy as np

from truehand.domains import get_model
from truehand.engine import Engine
from truehand.experiments.experiment import run
from truehand.experiments.report import (
    DEFAULT_RESULTS_DIR,
    DEFINITIONS,
    MATCHED_MODEL_NOTE,
    fraction,
    header_lines,
    pct,
    provenance,
    write_results,
)
from truehand.experiments.runner import ARM_NAMES
from truehand.views import config_view

MODULE = "truehand.experiments.stability"
DEFAULT_N = 300
DEFAULT_SEEDS = "1,2,3,4,5"
SPREAD_METRICS = (
    "correct_pct",
    "resolved_correct_pct",
    "confidently_wrong_pct",
    "unresolved_pct",
    "mean_steps",
)
POOLED_COUNTS = (
    "n",
    "correct",
    "resolved_correct",
    "confidently_wrong",
    "unresolved",
    "warnings_issued",
    "warnings_correct",
    "slips",
    "slips_warned",
    "misfit_readings",
    "trials_with_misfit",
)


def parse(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog=f"python -m {MODULE}", description=__doc__)
    parser.add_argument(
        "--n", type=int, default=DEFAULT_N, help="simulated faults per arm per seed"
    )
    parser.add_argument("--seeds", default=DEFAULT_SEEDS)
    parser.add_argument("--domain", default="circuit")
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_RESULTS_DIR)
    return parser.parse_args(list(argv))


def aggregate(per_seed: list[dict[str, dict[str, Any]]]) -> dict[str, dict[str, Any]]:
    """Mean and sample standard deviation across seeds, plus counts pooled over seeds."""
    output: dict[str, dict[str, Any]] = {}
    for arm in ARM_NAMES:
        runs = [seed_result[arm] for seed_result in per_seed]
        entry: dict[str, Any] = {}
        for metric in SPREAD_METRICS:
            values = np.array([r[metric] for r in runs], dtype=float)
            std = float(values.std(ddof=1)) if len(values) > 1 else 0.0
            entry[metric] = {"mean": float(values.mean()), "std": std, "per_seed": values.tolist()}
        entry["pooled"] = {count: int(sum(r[count] for r in runs)) for count in POOLED_COUNTS}
        output[arm] = entry
    return output


def spread(metrics: dict[str, Any], metric: str) -> str:
    return f"{pct(metrics[metric]['mean'])} ± {pct(metrics[metric]['std'])}"


def table(arms: dict[str, dict[str, Any]]) -> list[str]:
    lines = [
        "| Method | Faults (pooled) | Correct % (mean ± sd) | Resolved correct % (mean ± sd) | "
        "Confidently wrong % (mean ± sd) | Unresolved % (mean ± sd) | Mean steps | "
        "Warning precision (correct/issued) | Slip recall (warned/slips) | Out-of-model readings |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ]
    for arm, m in arms.items():
        pooled = m["pooled"]
        is_truehand = arm == "truehand"
        precision = (
            fraction(pooled["warnings_correct"], pooled["warnings_issued"])
            if is_truehand
            else "n/a"
        )
        recall = fraction(pooled["slips_warned"], pooled["slips"])
        misfits = str(pooled["misfit_readings"]) if is_truehand else "n/a"
        correct, resolved, wrong, unresolved = (
            spread(m, metric)
            for metric in (
                "correct_pct",
                "resolved_correct_pct",
                "confidently_wrong_pct",
                "unresolved_pct",
            )
        )
        lines.append(
            f"| {arm} | {pooled['n']} | {correct} | {resolved} | {wrong} | {unresolved} | "
            f"{m['mean_steps']['mean']:.2f} | {precision} | {recall} | {misfits} |"
        )
    return lines


def main(argv: Sequence[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    args = parse(argv)
    seeds = [int(s) for s in args.seeds.split(",")]
    per_seed = [run(args.n, seed, args.domain) for seed in seeds]
    payload = {
        **provenance("stability", MODULE, argv),
        "domain": args.domain,
        "seeds": seeds,
        "n": args.n,
        "config": config_view(Engine(get_model(args.domain))),
        "arms": aggregate(per_seed),
        "per_seed": dict(zip([str(s) for s in seeds], per_seed, strict=True)),
    }
    title = f"Stability: {len(seeds)} seeds x {args.n} simulated faults per method ({args.domain})"
    md = [
        *header_lines(payload, title),
        MATCHED_MODEL_NOTE,
        "",
        *table(payload["arms"]),
        *DEFINITIONS,
    ]
    write_results("stability", payload, md, args.out_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
