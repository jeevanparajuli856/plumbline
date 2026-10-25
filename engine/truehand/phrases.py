"""Shared sentence templates. Domains pass their own labels; the engine never builds text."""

from __future__ import annotations

from collections.abc import Sequence

PERCENT_DECIMALS = 1


def percent(probability: float) -> str:
    return f"{probability * 100:.{PERCENT_DECIMALS}f}%"


def instruction(site_label: str, verb: str) -> str:
    return f"{verb} {site_label}."


def warning(told_label: str, likely_label: str) -> str:
    return (
        "Your probe is not where you think it is. "
        f"That reading looks like {likely_label}, not {told_label}."
    )


def diagnosis(hypothesis_label: str, confidence: float) -> str:
    return f"{hypothesis_label}, {percent(confidence)} confident."


def unresolved(labels: Sequence[str], reason: str, what_differs: str) -> str:
    joined = " or ".join(labels)
    if reason == "indistinguishable":
        return (
            f"Unresolved: {joined}. They give the same {what_differs} everywhere I can measure, "
            "so I cannot tell them apart."
        )
    if reason == "no_informative_site":
        return f"Unresolved: {joined}. No place left to measure would tell them apart."
    return f"Unresolved: I stopped without a confident answer. Most likely {joined}."
