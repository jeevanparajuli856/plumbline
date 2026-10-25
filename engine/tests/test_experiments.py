"""Smoke tests for the experiment scripts at tiny N. Full runs write docs/results/."""

import json
from pathlib import Path

import numpy as np
import pytest

from truehand.domains import get_model
from truehand.engine import Engine
from truehand.experiments import experiment, mismatch, mkfigs, stability, sweep
from truehand.experiments.runner import ARM_NAMES, HandModel, make_policy, run_trial

LABEL = "Preliminary. Not peer reviewed."


def read_outputs(out: Path, name: str) -> tuple[dict, str]:
    [json_path] = list(out.glob(f"{name}_*.json"))
    [md_path] = list(out.glob(f"{name}_*.md"))
    return json.loads(json_path.read_text()), md_path.read_text()


def test_trial_with_a_perfect_hand_finds_the_truth() -> None:
    engine = Engine(get_model("circuit"))
    hand = HandModel(confusion=np.eye(6))
    policy = make_policy("truehand", engine)
    result = run_trial(policy, hand, engine, truth=12, seed=(1, 0))
    assert result.correct and not result.confidently_wrong
    assert result.warnings_issued == 0 and result.slips == 0


def test_bridging_and_poor_contact_hands_are_seeded() -> None:
    engine = Engine(get_model("circuit"))
    hand = HandModel(confusion=engine.confusion, bridge_p=0.5, contact_fail_p=0.3)
    policy = make_policy("entropy_exact", engine)
    a = run_trial(policy, hand, engine, truth=3, seed=(2, 1))
    b = run_trial(policy, hand, engine, truth=3, seed=(2, 1))
    assert a == b


def test_experiment_writes_labelled_md_and_json(tmp_path: Path) -> None:
    assert experiment.main(["4", "--seed", "3", "--out-dir", str(tmp_path)]) == 0
    payload, md = read_outputs(tmp_path, "experiment")
    assert set(payload["arms"]) == set(ARM_NAMES)
    assert payload["n"] == 4 and payload["seeds"] == [3]
    assert payload["simulated"] is True and payload["label"] == LABEL
    assert payload["command"].endswith("experiment 4 --seed 3 --out-dir " + str(tmp_path))
    assert LABEL in md and "simulated" in md.lower() and payload["git_sha"] in md


def test_experiment_is_deterministic_for_a_seed(tmp_path: Path) -> None:
    experiment.main(["3", "--seed", "5", "--out-dir", str(tmp_path / "a")])
    experiment.main(["3", "--seed", "5", "--out-dir", str(tmp_path / "b")])
    a, _ = read_outputs(tmp_path / "a", "experiment")
    b, _ = read_outputs(tmp_path / "b", "experiment")
    assert a["arms"] == b["arms"]


def test_experiment_runs_on_the_thermometer(tmp_path: Path) -> None:
    assert experiment.main(["3", "--domain", "thermometer", "--out-dir", str(tmp_path)]) == 0
    payload, _ = read_outputs(tmp_path, "experiment")
    assert payload["domain"] == "thermometer"


@pytest.mark.slow
def test_stability_reports_mean_and_std(tmp_path: Path) -> None:
    assert stability.main(["--n", "3", "--seeds", "1,2", "--out-dir", str(tmp_path)]) == 0
    payload, md = read_outputs(tmp_path, "stability")
    assert payload["seeds"] == [1, 2]
    assert {"mean", "std"} <= set(payload["arms"]["truehand"]["correct_pct"])
    assert LABEL in md


@pytest.mark.slow
def test_mismatch_covers_the_four_hand_models(tmp_path: Path) -> None:
    assert mismatch.main(["--n", "3", "--out-dir", str(tmp_path)]) == 0
    payload, _ = read_outputs(tmp_path, "mismatch")
    assert set(payload["scenarios"]) == {"lopsided", "three_row_jumps", "bridging", "poor_contact"}


@pytest.mark.slow
def test_sweep_has_matched_and_fixed_panels(tmp_path: Path) -> None:
    assert sweep.main(["--n", "2", "--points", "0.6,1.0", "--out-dir", str(tmp_path)]) == 0
    payload, _ = read_outputs(tmp_path, "sweep")
    assert set(payload["panels"]) == {"matched", "fixed"}
    assert [p["p_same"] for p in payload["panels"]["matched"]] == [0.6, 1.0]


@pytest.mark.slow
def test_mkfigs_writes_svg_figures(tmp_path: Path) -> None:
    experiment.main(["3", "--out-dir", str(tmp_path)])
    sweep.main(["--n", "2", "--points", "0.6,1.0", "--out-dir", str(tmp_path)])
    assert (
        mkfigs.main(["--results-dir", str(tmp_path), "--out-dir", str(tmp_path / "figures")]) == 0
    )
    svgs = sorted(p.name for p in (tmp_path / "figures").glob("*.svg"))
    assert len(svgs) == 6
    assert all("Simulated" in (tmp_path / "figures" / s).read_text() for s in svgs)


def test_truehand_policy_remeasures_after_an_out_of_model_reading() -> None:
    engine = Engine(get_model("circuit"))
    policy = make_policy("truehand", engine)
    rng = np.random.default_rng(0)
    state = policy.start()
    _, site = policy.decide(state, rng)
    assert policy.is_misfit(site, 6.0)
    after = policy.observe(state, site, 6.0)
    np.testing.assert_array_equal(after.belief, state.belief)
    resolution, again = policy.decide(after, rng)
    assert again == site and resolution.status == "continue"
    assert not make_policy("entropy_exact", engine).is_misfit(site, 6.0)


def test_summary_counts_misfit_readings() -> None:
    from truehand.experiments.runner import summarize

    engine = Engine(get_model("circuit"))
    hand = HandModel(confusion=engine.confusion)
    result = run_trial(make_policy("truehand", engine), hand, engine, truth=12, seed=(1, 0))
    summary = summarize([result])
    assert summary["misfit_readings"] == 0 and summary["trials_with_misfit"] == 0


def test_indistinguishable_pair_counts_as_correct_but_not_resolved_correct() -> None:
    engine = Engine(get_model("circuit"))
    truth = engine.model.hypothesis_index("LED_reversed")
    hand = HandModel(confusion=np.eye(6))
    result = run_trial(make_policy("truehand", engine), hand, engine, truth=truth, seed=(1, 0))
    assert result.status == "unresolved" and result.reason == "indistinguishable"
    assert result.correct and not result.resolved_correct


def test_max_steps_ending_is_not_correct_even_with_the_truth_on_top() -> None:
    from truehand.config import EngineConfig

    engine = Engine(get_model("circuit"), EngineConfig(max_steps=1))
    truth = engine.model.hypothesis_index("R3_10x_low")
    hand = HandModel(confusion=np.eye(6))
    result = run_trial(make_policy("truehand", engine), hand, engine, truth=truth, seed=(1, 0))
    assert result.reason == "max_steps"
    assert not result.correct and not result.resolved_correct


def test_summary_reports_resolved_correct_precision_and_recall_separately() -> None:
    from truehand.experiments.runner import TrialResult, summarize

    base = dict(confidently_wrong=False, status="resolved", reason=None, steps=2, misfit_readings=0)
    results = [
        TrialResult(
            correct=True,
            resolved_correct=True,
            warnings_issued=2,
            warnings_correct=1,
            slips=3,
            slips_warned=1,
            **base,
        ),
        TrialResult(
            correct=True,
            resolved_correct=True,
            warnings_issued=0,
            warnings_correct=0,
            slips=1,
            slips_warned=0,
            **base,
        ),
    ]
    summary = summarize(results)
    assert summary["resolved_correct_pct"] == 100.0
    assert summary["warning_precision"] == pytest.approx(0.5)
    assert summary["slip_recall"] == pytest.approx(0.25)


def test_results_text_is_built_from_the_named_constants() -> None:
    from truehand.config import MAX_STEPS, OUT_OF_MODEL_SIGMAS
    from truehand.experiments import mismatch as mismatch_module
    from truehand.experiments.report import DEFINITIONS
    from truehand.experiments.runner import CONFIDENTLY_WRONG_THRESHOLD

    text = " ".join(DEFINITIONS)
    assert f"{CONFIDENTLY_WRONG_THRESHOLD:g}" in text
    assert f"{MAX_STEPS} readings" in text
    assert f"{OUT_OF_MODEL_SIGMAS:g} sigma" in text
    described = mismatch_module.describe_scenarios()
    assert f"{mismatch_module.BRIDGE_P:g}" in described
    assert f"{mismatch_module.POOR_CONTACT_P:g}" in described
    assert f"{mismatch_module.LOPSIDED[-1]:g}" in described
