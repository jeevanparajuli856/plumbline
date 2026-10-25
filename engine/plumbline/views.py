"""Plain-dict views of catalogs, configs and session steps, shaped like API_CONTRACT section 3.

Probabilities are clipped to [0, 1] at this boundary so rounding never reports 1.0000000002.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import numpy as np

from plumbline.engine import Engine
from plumbline.model import FloatArray, InstrumentModel

if TYPE_CHECKING:
    from plumbline.session import Session, StepRecord


def probs(values: FloatArray) -> list[float]:
    return np.clip(values, 0.0, 1.0).tolist()


def floats(values: FloatArray) -> list[float]:
    return np.asarray(values, dtype=np.float64).tolist()


def catalog_view(
    model: InstrumentModel, engine: Engine, include_expected: bool = False
) -> dict[str, Any]:
    ids = model.hypothesis_ids
    return {
        "domain": model.domain,
        "simulated": model.simulated,
        "reading_unit": model.reading.unit,
        "sigma": engine.sigma,
        "hypotheses": [
            {"id": h.id, "label": h.label, "spoken": h.spoken, "description": h.description}
            for h in model.hypotheses
        ],
        "sites": [{"index": s.index, "label": s.label, "spoken": s.spoken} for s in model.sites],
        "classes": [[ids[i] for i in members] for members in engine.classes],
        "expected_readings": floats(engine.expected) if include_expected else None,
    }


def thresholds_view(engine: Engine) -> dict[str, float | int]:
    config = engine.config
    return {
        "resolve": config.resolve_threshold,
        "placement_warning": config.warning_threshold,
        "min_gain_bits": config.min_gain_bits,
        "class_tolerance": engine.class_tolerance,
        "max_steps": config.max_steps,
    }


def config_view(engine: Engine) -> dict[str, Any]:
    return {
        "sigma": engine.sigma,
        "confusion": floats(engine.confusion),
        "thresholds": thresholds_view(engine),
    }


def instruction_view(model: InstrumentModel, site: int, gains: FloatArray) -> dict[str, Any]:
    return {
        "site": site,
        "label": model.sites[site].label,
        "spoken": model.instruction_phrase(site),
        "gain_bits": floats(gains),
    }


def diagnosis_view(model: InstrumentModel, hypothesis: int, confidence: float) -> dict[str, Any]:
    confidence = float(min(max(confidence, 0.0), 1.0))
    return {
        "hypothesis_id": model.hypothesis_ids[hypothesis],
        "label": model.hypotheses[hypothesis].label,
        "confidence": confidence,
        "spoken": model.diagnosis_phrase(hypothesis, confidence),
    }


def _baseline_view(session: Session, record: StepRecord) -> dict[str, Any]:
    belief = record.baseline.belief
    top = int(np.argmax(belief))
    baseline_engine = session.baseline.engine
    class_mass = baseline_engine.class_belief(belief)
    is_confident = float(class_mass.max()) >= baseline_engine.config.resolve_threshold
    return {
        "method": session.baseline.method,
        "shadow": True,
        "belief": probs(belief),
        "diagnosis": diagnosis_view(session.model, top, float(belief[top]))
        if is_confident
        else None,
    }


def step_view(session: Session, record: StepRecord, truth_visible: bool) -> dict[str, Any]:
    model = session.model
    warning = record.warning
    diagnosis = session.diagnosis(record)
    unresolved = None
    if record.resolution.status == "unresolved":
        classes = session.unresolved_classes(record)
        reason = record.resolution.reason or "max_steps"
        flat = [hypothesis_id for members in classes for hypothesis_id in members]
        unresolved = {
            "classes": classes,
            "reason": reason,
            "text": model.unresolved_phrase(flat, reason),
        }
    next_site = record.next_told_site
    return {
        "step_index": record.index,
        "instruction": instruction_view(model, record.told_site, record.told_gains),
        "reading": record.reading,
        "unit": model.reading.unit,
        "landed_site": record.landed_site if truth_visible else None,
        "placement": {
            "probs": probs(record.placement),
            "warning": {
                "active": warning.active,
                "p_off_site": warning.p_off_site,
                "likely_site": warning.likely_site,
                "text": model.warning_phrase(record.told_site, warning.likely_site)
                if warning.active
                else "",
            },
        },
        "placement_audit": [
            {"step_index": i, "probs": probs(audit)}
            for i, audit in enumerate(record.placement_audit)
        ],
        "belief": probs(record.belief),
        "entropy_bits": record.entropy_bits,
        "status": record.resolution.status,
        "diagnosis": (
            diagnosis_view(model, model.hypothesis_index(diagnosis[0]), diagnosis[1])
            if diagnosis
            else None
        ),
        "unresolved": unresolved,
        "next_instruction": (
            instruction_view(model, next_site, record.engine_choice.gains)
            if next_site is not None
            else None
        ),
        "baseline": _baseline_view(session, record),
    }


def session_view(session: Session, truth_visible: bool) -> dict[str, Any]:
    model = session.model
    instruction = session.instruction
    truth = session.true_index
    return {
        "domain": model.domain,
        "mode": session.mode,
        "simulated": model.simulated,
        "reveal": session.reveal,
        "status": session.status,
        "config": config_view(session.engine),
        "catalog": catalog_view(model, session.engine),
        "instruction": (
            instruction_view(model, instruction, session.instruction_gains)
            if instruction is not None and session.status == "continue"
            else None
        ),
        "belief": probs(session.belief),
        "entropy_bits": session.engine.entropy_bits(session.belief),
        "steps": [step_view(session, r, truth_visible) for r in session.steps],
        "true_hypothesis": model.hypothesis_ids[truth]
        if truth_visible and truth is not None
        else None,
    }
