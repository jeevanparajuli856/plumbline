"""Write an experiment's results to docs/results/<name>_<date>.{md,json} with provenance."""

from __future__ import annotations

import json
from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from plumbline.config import (
    CONFUSION_P_PM1,
    CONFUSION_P_PM2,
    CONFUSION_P_SAME,
    MAX_STEPS,
    OUT_OF_MODEL_SIGMAS,
    PLACEMENT_WARNING_THRESHOLD,
    RESOLVE_THRESHOLD,
)
from plumbline.experiments.runner import CONFIDENTLY_WRONG_THRESHOLD
from plumbline.record_fixtures import git_sha

LABEL = "Preliminary. Not peer reviewed."
SIMULATED_NOTE = "All results are simulated: a simulated hand on our own circuit model, not people."
DEFAULT_RESULTS_DIR = Path(__file__).resolve().parents[3] / "docs" / "results"
PCT_DECIMALS = 1


def command_line(module: str, argv: Sequence[str]) -> str:
    return " ".join(["uv run --project engine python -m", module, *argv])


def provenance(name: str, module: str, argv: Sequence[str]) -> dict[str, Any]:
    return {
        "name": name,
        "command": command_line(module, argv),
        "git_sha": git_sha(),
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "simulated": True,
        "label": LABEL,
        "note": SIMULATED_NOTE,
    }


def pct(value: float) -> str:
    return f"{value:.{PCT_DECIMALS}f}"


def header_lines(payload: dict[str, Any], title: str) -> list[str]:
    return [
        f"# {title}",
        "",
        f"**Simulated. {LABEL}** {SIMULATED_NOTE}",
        "",
        f"- Command: `{payload['command']}`",
        f"- Git SHA: `{payload['git_sha']}`",
        f"- Generated: {payload['generated_at']}",
        f"- Seeds: {payload.get('seeds')}; n per arm per seed: {payload.get('n')}",
        "",
    ]


ASSUMED_CONFUSION = (
    f"P(lands on told site) {CONFUSION_P_SAME:g}, P(one site away) {CONFUSION_P_PM1:g} each "
    f"side, P(two sites away) {CONFUSION_P_PM2:g} each side, clipped at the edges"
)
MATCHED_MODEL_NOTE = (
    "The simulated hand here uses the same confusion model the engine assumes "
    f"({ASSUMED_CONFUSION}): this is the matched-model case. The stress tests are "
    "`mismatch_<date>.md` (hands that break the assumption) and `sweep_<date>.md` (the true "
    "landing rate varied, with the engine's model matched or held fixed)."
)


def fraction(numerator: int, denominator: int) -> str:
    return f"{numerator}/{denominator}"


def arm_table(arms: dict[str, dict[str, Any]]) -> list[str]:
    columns = [
        "Method",
        "n",
        "Correct %",
        "Resolved correct %",
        "Confidently wrong %",
        "Unresolved %",
        "Mean steps",
        "Warning precision (correct/issued)",
        "Slip recall (warned/slips)",
        "Out-of-model readings",
    ]
    lines = ["| " + " | ".join(columns) + " |", "|" + "---|" * len(columns)]
    for arm, m in arms.items():
        is_plumbline = arm == "plumbline"
        precision = fraction(m["warnings_correct"], m["warnings_issued"]) if is_plumbline else "n/a"
        recall = fraction(m["slips_warned"], m["slips"])
        misfits = str(m["misfit_readings"]) if is_plumbline else "n/a"
        lines.append(
            f"| {arm} | {m['n']} | {pct(m['correct_pct'])} | {pct(m['resolved_correct_pct'])} | "
            f"{pct(m['confidently_wrong_pct'])} | {pct(m['unresolved_pct'])} | "
            f"{m['mean_steps']:.2f} | {precision} | {recall} | {misfits} |"
        )
    return lines


DEFINITIONS = [
    "",
    "Definitions: *correct* = the run ended resolved on the true hypothesis, or ended "
    "unresolved as *indistinguishable* with the truth inside the refused class (the "
    "LED_open / LED_reversed pair counts as correct when the truth is in it); runs that end "
    f"at the {MAX_STEPS} readings limit or with no informative site left are not correct. "
    "*Resolved correct* = resolved on the true hypothesis only. *Confidently wrong* = the "
    "final top class excludes the truth and holds at least "
    f"{CONFIDENTLY_WRONG_THRESHOLD:g} of the belief. *Resolved* = top class mass at least "
    f"{RESOLVE_THRESHOLD:g} on a single-member class. A *warning* fires when P(probe off the "
    f"told site) > {PLACEMENT_WARNING_THRESHOLD:g}; *warning precision* = warnings issued on a "
    "real slip / warnings issued; *slip recall* = slips that drew a warning / slips (both "
    "count the same events, so the numerators match). Only plumbline issues warnings. An "
    f"*out-of-model reading* is more than {OUT_OF_MODEL_SIGMAS:g} sigma from every predicted "
    "reading the hand could reach; plumbline then keeps its belief and asks for the same "
    "site again, and the reading still counts as a step.",
]


def write_results(name: str, payload: dict[str, Any], md_lines: list[str], out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    date = payload["generated_at"][:10]
    json_path = out_dir / f"{name}_{date}.json"
    json_path.write_text(json.dumps(payload, indent=1, allow_nan=False) + "\n")
    (out_dir / f"{name}_{date}.md").write_text("\n".join(md_lines) + "\n")
    return json_path
