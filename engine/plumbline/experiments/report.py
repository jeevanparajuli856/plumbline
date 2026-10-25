"""Write an experiment's results to docs/results/<name>_<date>.{md,json} with provenance."""

from __future__ import annotations

import json
from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

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


def arm_table(arms: dict[str, dict[str, Any]]) -> list[str]:
    columns = [
        "Method",
        "n",
        "Correct %",
        "Confidently wrong %",
        "Unresolved %",
        "Mean steps",
        "Warnings (correct/issued)",
        "Slips warned",
    ]
    lines = ["| " + " | ".join(columns) + " |", "|" + "---|" * len(columns)]
    for arm, m in arms.items():
        warnings = (
            f"{m['warnings_correct']}/{m['warnings_issued']}" if arm == "plumbline" else "n/a"
        )
        slips = f"{m['slips_warned']}/{m['slips']}" if arm == "plumbline" else f"0/{m['slips']}"
        lines.append(
            f"| {arm} | {m['n']} | {pct(m['correct_pct'])} | {pct(m['confidently_wrong_pct'])} | "
            f"{pct(m['unresolved_pct'])} | {m['mean_steps']:.2f} | {warnings} | {slips} |"
        )
    return lines


DEFINITIONS = [
    "",
    "Definitions: *correct* = the final top distinguishability class contains the true "
    "hypothesis; *confidently wrong* = the final top class excludes the truth and holds at "
    "least 0.9 of the belief; *unresolved* = the session ended unresolved (indistinguishable, "
    "no informative site, or 12 readings); a *warning* is correct when the simulated probe "
    "really was off the told site. Only plumbline issues placement warnings.",
]


def write_results(name: str, payload: dict[str, Any], md_lines: list[str], out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    date = payload["generated_at"][:10]
    json_path = out_dir / f"{name}_{date}.json"
    json_path.write_text(json.dumps(payload, indent=1, allow_nan=False) + "\n")
    (out_dir / f"{name}_{date}.md").write_text("\n".join(md_lines) + "\n")
    return json_path
