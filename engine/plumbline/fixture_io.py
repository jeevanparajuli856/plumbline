"""Parity fixture JSON (API_CONTRACT section 8) to and from ``Session``.

The web ``Fixture`` Zod schema (apps/web/src/engine/schemas.ts) parses what this writes.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

import numpy as np

from plumbline.config import ConfusionSpec, EngineConfig
from plumbline.domains import circuit, get_model
from plumbline.engine import Engine
from plumbline.session import ReplayScript, Session, StepRecord
from plumbline.views import config_view, floats, probs

SCHEMA_VERSION = 1


def domain_parameters(domain: str) -> dict[str, float]:
    """Calibration choices a fixture must state (ADR-0002: the LED values are fitted)."""
    if domain == "circuit":
        return {
            "battery_volts": circuit.BATTERY_VOLTS,
            "battery_low_volts": circuit.BATTERY_LOW_VOLTS,
            "led_vf0_volts": circuit.LED_VF0_VOLTS,
            "led_rs_ohms": circuit.LED_RS_OHMS,
            "open_ohms": circuit.OPEN_OHMS,
            "short_ohms": circuit.SHORT_OHMS,
        }
    return {}


def _step_json(session: Session, record: StepRecord) -> dict[str, Any]:
    ids = session.model.hypothesis_ids
    baseline_belief = record.baseline.belief
    baseline_top = int(np.argmax(baseline_belief))
    diagnosis = session.diagnosis(record)
    step: dict[str, Any] = {
        "index": record.index,
        "told_site": record.told_site,
        "landed_site": record.landed_site,
        "reading": record.reading,
        "belief": probs(record.belief),
        "entropy_bits": record.entropy_bits,
        "placement": probs(record.placement),
        "p_off_site": record.warning.p_off_site,
        "likely_site": record.warning.likely_site,
        "warning": record.warning.active,
        "placement_audit": [probs(audit) for audit in record.placement_audit],
        "status": record.resolution.status,
        "engine_choice": {
            "site": record.engine_choice.site,
            "gain_bits": floats(record.engine_choice.gains),
        },
        "next_told_site": record.next_told_site,
        "baseline": {
            "method": session.baseline.method,
            "belief": probs(baseline_belief),
            "top": ids[baseline_top],
            "confidence": float(min(baseline_belief[baseline_top], 1.0)),
        },
        "diagnosis": (
            {"hypothesis_id": diagnosis[0], "confidence": min(diagnosis[1], 1.0)}
            if diagnosis
            else None
        ),
        "unresolved": None,
    }
    if record.resolution.status == "unresolved":
        classes = session.unresolved_classes(record)
        reason = record.resolution.reason or "max_steps"
        flat = [hypothesis_id for members in classes for hypothesis_id in members]
        step["unresolved"] = {
            "classes": classes,
            "reason": reason,
            "text": session.model.unresolved_phrase(flat, reason),
        }
    return step


def fixture_from_session(
    session: Session, name: str, generated_by: str, git_sha: str, generated_at: str
) -> dict[str, Any]:
    model, engine = session.model, session.engine
    nodes, weights = engine.quadrature
    config = config_view(engine)
    config["quadrature"] = {"x": floats(nodes), "w": floats(weights)}
    config["domain_parameters"] = domain_parameters(model.domain)
    if session.mode == "simulate":
        config["truth_confusion"] = floats(session.truth_confusion)
    assert session.true_index is not None
    return {
        "schema_version": SCHEMA_VERSION,
        "name": name,
        "domain": model.domain,
        "mode": "replay",
        "source_mode": session.mode,
        "seed": session.seed,
        "simulated": model.simulated,
        "generated_by": generated_by,
        "git_sha": git_sha,
        "generated_at": generated_at,
        "config": config,
        "catalog": {
            "hypothesis_ids": list(model.hypothesis_ids),
            "hypothesis_labels": [h.label for h in model.hypotheses],
            "site_labels": [s.label for s in model.sites],
            "expected_readings": floats(engine.expected),
            "classes": [[model.hypothesis_ids[i] for i in members] for members in engine.classes],
        },
        "true_hypothesis": model.hypothesis_ids[session.true_index],
        "prior_instruction": {
            "site": session.prior_choice.site,
            "gain_bits": floats(session.prior_choice.gains),
        },
        "steps": [_step_json(session, record) for record in session.steps],
    }


def engine_from_fixture(fixture: Mapping[str, Any]) -> Engine:
    """Rebuild the engine with the fixture's own sigma, confusion matrix and thresholds."""
    config = fixture["config"]
    thresholds = config["thresholds"]
    matrix = tuple(tuple(float(p) for p in row) for row in config["confusion"])
    engine_config = EngineConfig(
        sigma=float(config["sigma"]),
        confusion=ConfusionSpec(matrix=matrix),
        warning_threshold=float(thresholds["placement_warning"]),
        resolve_threshold=float(thresholds["resolve"]),
        min_gain_bits=float(thresholds["min_gain_bits"]),
        class_tolerance=float(thresholds["class_tolerance"]),
        quadrature_points=len(config["quadrature"]["x"]),
        max_steps=int(thresholds["max_steps"]),
    )
    return Engine(get_model(str(fixture["domain"])), engine_config)


def session_from_fixture(fixture: Mapping[str, Any], reveal: str = "after_step") -> Session:
    """A replay session that recomputes every number from the fixture's recorded hand."""
    reveal_mode = "never" if reveal == "never" else "after_step"
    return Session(
        engine_from_fixture(fixture),
        mode="replay",
        seed=int(fixture.get("seed", 0)),
        fixture=ReplayScript.from_mapping(fixture),
        reveal=reveal_mode,
    )
