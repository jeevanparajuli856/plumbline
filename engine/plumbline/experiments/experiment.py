"""Compare plumbline with the baselines on N simulated faults (one seed).

uv run --project engine python -m plumbline.experiments.experiment N [--seed S] [--domain D]
"""

from __future__ import annotations

import argparse
import sys
from collections.abc import Sequence
from pathlib import Path

from plumbline.domains import DOMAIN_FACTORIES, get_model
from plumbline.engine import Engine
from plumbline.experiments.report import (
    ASSUMED_CONFUSION,
    DEFAULT_RESULTS_DIR,
    DEFINITIONS,
    MATCHED_MODEL_NOTE,
    arm_table,
    header_lines,
    provenance,
    write_results,
)
from plumbline.experiments.runner import ARM_NAMES, HandModel, draw_truths, run_arms
from plumbline.views import config_view

MODULE = "plumbline.experiments.experiment"
DEFAULT_SEED = 1


def parse(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog=f"python -m {MODULE}", description=__doc__)
    parser.add_argument("n", type=int, help="simulated faults per arm")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--domain", choices=sorted(DOMAIN_FACTORIES), default="circuit")
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_RESULTS_DIR)
    return parser.parse_args(list(argv))


def run(n: int, seed: int, domain: str) -> dict[str, dict]:
    engine = Engine(get_model(domain))
    truths = draw_truths(engine.n_hypotheses, n, seed)
    return run_arms(ARM_NAMES, engine, HandModel(engine.confusion), truths, seed)


def main(argv: Sequence[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    args = parse(argv)
    engine = Engine(get_model(args.domain))
    payload = {
        **provenance("experiment", MODULE, argv),
        "domain": args.domain,
        "seeds": [args.seed],
        "n": args.n,
        "truths": "uniform over the catalog, drawn from the seed",
        "hand": f"engine confusion model ({ASSUMED_CONFUSION}), sigma noise, meter rounding",
        "config": config_view(engine),
        "arms": run(args.n, args.seed, args.domain),
    }
    title = f"Experiment: methods compared on {args.n} simulated faults ({args.domain})"
    md = [
        *header_lines(payload, title),
        MATCHED_MODEL_NOTE,
        "",
        *arm_table(payload["arms"]),
        *DEFINITIONS,
    ]
    write_results("experiment", payload, md, args.out_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
