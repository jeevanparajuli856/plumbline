---
name: plumbline-engine
description: Reference for the Plumbline inference engine - the joint fault-and-probe-position math, fault catalog and reference voltages, the Python package layout wrapping the handsight scripts, the FastAPI contract, the parity-fixture protocol for the TypeScript port, and how to reproduce the experiment numbers. Use before touching engine/, apps/web/src/engine/, or any number shown to judges.
---

# Plumbline engine

Source documents: `docs/brief/PLUMBLINE_BUILD.md` (sections 4-6) and `docs/brief/Plumbline_Scale_and_Build.md`. The `handsight` Python code (circuit.py, engine.py, experiment.py, stability.py, mkfigs.py) comes from the teammate and lands in `engine/`.

## The model
- Faults `f ∈ F`, |F| = 33 (31 electrically distinct classes; two pairs are indistinguishable and must be reported as unresolved).
- Breadboard rows 1..6. Nominal node voltages: 9.000, 3.871, 1.733, 2.499, 0.416, 0.866 V. LED branch 4.16 mA, divider 0.97 mA, R1 total 5.13 mA.
- Confusion model (told row n, lands on row l): P(l=n)=0.78, P(l=n±1)=0.08 each, P(l=n±2)=0.03 each; clipped and renormalized at the board edges. These three numbers are the only assumptions; a measured matrix from the Louisiana Center for the Blind replaces them via `Config`.
- Likelihood: `P(r | f, n) = Σ_l P(l|n) · N(r; V_f(l), σ)`, σ = 0.02 V.
- Update: `b'(f) ∝ b(f) · P(r | f, n)`. Do it in log-space, renormalize, assert finite.
- Instruction: `n* = argmax_n [H(b) − E_r H(b'|r)]`, expectation by quadrature or Monte Carlo over r with the same σ.
- Placement posterior: `P(l | r, n) ∝ P(l|n) · Σ_f b(f) N(r; V_f(l), σ)`. Warn when `P(l ≠ n | r) > 0.5`.
- Baselines kept for the side-by-side: entropy with exact probe (published method), fixed checklist, random order.

## Worked example (the demo fixture)
True fault: R3 ten times too small. Told row 3, hand lands row 2, reading 3.671 V. Published method: 100.0% R2 shorted (wrong). Plumbline: 63.5% on a wrong candidate, not confident, asks again; second reading 0.338 V; declares R3 10x low at 97.6%. Reproduce from `engine/fixtures/parity/worked_example.json`; the UI replays it in "demo" mode.

## Python package layout (target)
```
engine/
  pyproject.toml            uv-managed; deps: numpy, fastapi, uvicorn, pydantic; dev: pytest, pytest-cov, httpx, ruff, pyright
  plumbline/
    __init__.py
    config.py               Config dataclass: sigma, confusion probs, thresholds, seed
    circuit.py              MNA solver + fault catalog + row map (teammate's file, unchanged where possible)
    engine.py               belief, likelihoods, info gain, placement posterior, the four arms
    session.py              Session: state machine (awaiting_reading -> updated -> resolved|unresolved), seeded noisy hand for simulation
    baselines.py            published/entropy-exact, checklist, random
    experiments/            experiment.py, stability.py, mkfigs.py wrappers (original scripts stay runnable)
  plumbline_api/
    main.py                 FastAPI app, CORS, routers
    schemas.py              Pydantic v2 models
    routers/sessions.py
  fixtures/parity/*.json    recorded sessions for the TS port
  tests/
```

## API contract (v0)
```
POST /sessions                     {mode: "simulate"|"live"|"replay", seed?: int, true_fault?: str, fixture?: str}
                                   -> {session_id, instruction: {row}, belief: [...], entropy, catalog: [...]}
POST /sessions/{id}/readings       {volts: float}              (live: the human read the meter; simulate: server samples landed row)
                                   -> {accepted: true, landed_row?: int (simulate/replay only, after reveal), placement: [6 floats],
                                       warning: {active: bool, p_off_row: float, text: str}, belief: [...], entropy,
                                       status: "continue"|"resolved"|"unresolved", diagnosis?: {fault, confidence}, next_instruction?: {row},
                                       baseline: {method: "entropy_exact", belief: [...], diagnosis?: {...}}}
GET  /sessions/{id}                -> full state + reading log
POST /sessions/{id}/reset
GET  /catalog                      -> faults with human-readable descriptions, distinguishability classes
GET  /health
```
All floats finite, lists bounded, rows 1..6 validated. Errors return `{error: {code, message}}`.

## Parity protocol (Python -> TypeScript)
1. `uv run --project engine python -m plumbline.record_fixtures` writes `fixtures/parity/{worked_example,seed_1..5,slip_heavy}.json` with: config, per-step instruction, reading, belief (full vector), placement, entropy, warning flag, status.
2. TS tests in `apps/web/src/engine/__tests__/parity.test.ts` load the same JSON, replay readings, assert `maxAbs(belief - expected) < 1e-6`, identical instructions, identical status.
3. The TS port may power the UI only once parity passes on all fixtures; until then the UI calls the API.

## Reproducing the experiment numbers
```
uv run --project engine python engine/plumbline/experiments/experiment.py 400
uv run --project engine python engine/plumbline/experiments/stability.py
```
Expected (from the brief, five seeds, 1500 faults/arm): Plumbline 99.0 ± 0.4% correct, 1.0 ± 0.4% confidently wrong; published method 78.7 ± 1.8% / 21.2 ± 1.8%; placement warnings 176/178 right. If your run differs, report your numbers with the command and seed; never quote the brief as if it were your run.
