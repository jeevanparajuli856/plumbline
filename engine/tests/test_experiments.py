"""Smoke tests for the experiment scripts at tiny N. Full runs write docs/results/."""

import json
from pathlib import Path

import numpy as np
import pytest

from plumbline.domains import get_model
from plumbline.engine import Engine
from plumbline.experiments import experiment, mismatch, mkfigs, stability, sweep
from plumbline.experiments.runner import ARM_NAMES, HandModel, make_policy, run_trial

LABEL = "Preliminary. Not peer reviewed."


def read_outputs(out: Path, name: str) -> tuple[dict, str]:
    [json_path] = list(out.glob(f"{name}_*.json"))
    [md_path] = list(out.glob(f"{name}_*.md"))
    return json.loads(json_path.read_text()), md_path.read_text()


def test_trial_with_a_perfect_hand_finds_the_truth() -> None:
    engine = Engine(get_model("circuit"))
    hand = HandModel(confusion=np.eye(6))
    policy = make_policy("plumbline", engine)
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
    assert {"mean", "std"} <= set(payload["arms"]["plumbline"]["correct_pct"])
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


def test_plumbline_policy_remeasures_after_an_out_of_model_reading() -> None:
    engine = Engine(get_model("circuit"))
    policy = make_policy("plumbline", engine)
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
    from plumbline.experiments.runner import summarize

    engine = Engine(get_model("circuit"))
    hand = HandModel(confusion=engine.confusion)
    result = run_trial(make_policy("plumbline", engine), hand, engine, truth=12, seed=(1, 0))
    summary = summarize([result])
    assert summary["misfit_readings"] == 0 and summary["trials_with_misfit"] == 0
