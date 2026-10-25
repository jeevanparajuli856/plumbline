"""Six SVG figures from the latest results JSON, the worked-example fixture and the models.

uv run --project engine python -m plumbline.experiments.mkfigs [--results-dir D] [--out-dir D]
"""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import numpy as np

from plumbline.config import CONFUSION_P_SAME
from plumbline.domains import get_model
from plumbline.domains.thermometer import DEPTHS_CM
from plumbline.experiments import svg
from plumbline.experiments.report import DEFAULT_RESULTS_DIR
from plumbline.record_fixtures import DEFAULT_OUT as FIXTURES_DIR

MODULE = "plumbline.experiments.mkfigs"
PERCENT = 100.0


def latest(results_dir: Path, name: str) -> dict[str, Any] | None:
    paths = sorted(results_dir.glob(f"{name}_*.json"))
    return json.loads(paths[-1].read_text()) if paths else None


def arm_metric(arm: dict[str, Any], metric: str) -> float:
    value = arm[metric]
    return float(value["mean"]) if isinstance(value, dict) else float(value)


def pooled(arm: dict[str, Any]) -> dict[str, Any]:
    return arm.get("pooled", arm)


def fig1_arms(source: dict[str, Any]) -> str:
    arms = source["arms"]
    return svg.bar_chart(
        f"Methods compared ({source['name']}, {source['command'].split('-m ')[1]})",
        list(arms),
        {
            "correct %": [arm_metric(a, "correct_pct") for a in arms.values()],
            "confidently wrong %": [arm_metric(a, "confidently_wrong_pct") for a in arms.values()],
        },
        "percent of simulated faults",
        PERCENT,
    )


def fig2_sweep(sweep: dict[str, Any] | None) -> str:
    if sweep is None:
        return svg.document("Sweep over P(lands on told site): not computed", [])
    matched, fixed = sweep["panels"]["matched"], sweep["panels"]["fixed"]
    xs = [p["p_same"] for p in matched]
    return svg.line_chart(
        "Correct diagnosis vs how often the hand lands where told",
        xs,
        {
            "plumbline (matched model)": [p["arms"]["plumbline"]["correct_pct"] for p in matched],
            f"plumbline (fixed {CONFUSION_P_SAME:g})": [
                p["arms"]["plumbline"]["correct_pct"] for p in fixed
            ],
            "published method": [p["arms"]["entropy_exact"]["correct_pct"] for p in matched],
        },
        "P(probe lands on the told row)",
        "correct %",
        0.0,
        PERCENT,
    )


def fig3_worked_example(fixture: dict[str, Any]) -> str:
    ids = fixture["catalog"]["hypothesis_ids"]
    tracked = ["R3_short", "R3_10x_low", "R2_short"]
    series: dict[str, list[float]] = {}
    for hypothesis in tracked:
        index = ids.index(hypothesis)
        series[f"plumbline: {hypothesis}"] = [
            PERCENT * s["belief"][index] for s in fixture["steps"]
        ]
        series[f"published: {hypothesis}"] = [
            PERCENT * s["baseline"]["belief"][index] for s in fixture["steps"]
        ]
    steps = [f"after {s['reading']} V" for s in fixture["steps"]]
    return svg.bar_chart(
        "Worked example: belief after each reading (fixture)", steps, series, "belief %", PERCENT
    )


def fig4_warnings(source: dict[str, Any], mismatch: dict[str, Any] | None) -> str:
    rows = {source["name"]: pooled(source["arms"]["plumbline"])}
    for scenario, arms in (mismatch or {}).get("scenarios", {}).items():
        rows[scenario] = arms["plumbline"]
    precision = [
        PERCENT * r["warnings_correct"] / r["warnings_issued"] if r["warnings_issued"] else 0.0
        for r in rows.values()
    ]
    recall = [
        PERCENT * r["slips_warned"] / r["slips"] if r["slips"] else 0.0 for r in rows.values()
    ]
    return svg.bar_chart(
        "Placement warnings: precision and recall",
        list(rows),
        {"precision %": precision, "slips caught %": recall},
        "percent",
        PERCENT,
    )


def fig5_thermometer() -> str:
    model = get_model("thermometer")
    expected = model.expected_readings()
    series = {h.label: expected[i].tolist() for i, h in enumerate(model.hypotheses)}
    return svg.line_chart(
        "Simulated roast: temperature by probe depth for each doneness class",
        list(DEPTHS_CM),
        series,
        "probe depth (cm)",
        "temperature (C)",
        30.0,
        100.0,
    )


def fig6_distinguishability() -> str:
    model = get_model("circuit")
    expected = model.expected_readings()
    separation = np.abs(expected[:, None, :] - expected[None, :, :]).max(axis=2)
    return svg.heatmap(
        "Circuit: largest voltage difference between each pair of faults",
        separation,
        list(model.hypothesis_ids),
        "max |dV| over rows (V)",
    )


def parse(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog=f"python -m {MODULE}", description=__doc__)
    parser.add_argument("--results-dir", type=Path, default=DEFAULT_RESULTS_DIR)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_RESULTS_DIR / "figures")
    return parser.parse_args(list(argv))


def main(argv: Sequence[str] | None = None) -> int:
    args = parse(list(sys.argv[1:] if argv is None else argv))
    source = latest(args.results_dir, "stability") or latest(args.results_dir, "experiment")
    if source is None:
        sys.stderr.write("run experiment.py or stability.py first\n")
        return 1
    worked = json.loads((FIXTURES_DIR / "worked_example.json").read_text())
    figures = {
        "fig1_arms": fig1_arms(source),
        "fig2_sweep": fig2_sweep(latest(args.results_dir, "sweep")),
        "fig3_worked_example": fig3_worked_example(worked),
        "fig4_warnings": fig4_warnings(source, latest(args.results_dir, "mismatch")),
        "fig5_thermometer": fig5_thermometer(),
        "fig6_distinguishability": fig6_distinguishability(),
    }
    args.out_dir.mkdir(parents=True, exist_ok=True)
    for name, content in figures.items():
        (args.out_dir / f"{name}.svg").write_text(content)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
