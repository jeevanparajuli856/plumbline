---
name: plumbline-engine
description: Reference for the Truehand inference engine - the joint fault-and-probe-position math, fault catalog and reference voltages, the domain-agnostic Python package layout, the v1 API (contract lives in docs/API_CONTRACT.md), the parity-fixture protocol for the TypeScript port, and how to reproduce the experiment numbers. Use before touching engine/, apps/web/src/engine/, or any number shown to judges.
---

# Truehand engine

Source documents: `docs/brief/PLUMBLINE_BUILD.md` (sections 4-6), `docs/brief/Plumbline_Scale_and_Build.md`, and the competition plan dated 2026-10-25 (Appendix A). The engine is rebuilt test-first from the six-line math (ADR 0002). The teammate's `handsight` scripts, when they arrive, go to `engine/plumbline/legacy/` and become a parity reference, not the source of truth.

## The model
- Faults `f ∈ F`, |F| = 33. Distinguishability classes are computed by union-find at tolerance 1e-3 V. Scratch reconstruction gives 32 classes (exact pair LED_open / LED_reversed; near pair R7_short / R7_10x_low differs by 45 mV at row 5 only). The brief said 31. Report whatever `build_catalog` computes; the catalog is data.
- Breadboard rows 1..6 (0-based site indices 0..5 in code and API; 1-based labels in the UI). Reference nominal voltages: 9.000, 3.871, 1.733, 2.499, 0.416, 0.866 V. Scratch MNA: [9.0000 3.8708 1.7326 2.4989 0.4157 0.8663], max residual 0.359 mV; I_LED 4.157 mA, I_div 0.972 mA, I_R1 5.129 mA.
- Confusion model (told row n, lands on row l): P(l=n)=0.78, P(l=n±1)=0.08 each, P(l=n±2)=0.03 each; clipped and renormalized at the board edges (row 1 becomes .876/.090/.034). These three numbers are the only assumptions; a measured matrix from the Louisiana Center for the Blind replaces them via `Config.confusion.matrix`.
- Likelihood: `P(r | f, n) = Σ_l P(l|n) · N(r; V_f(l), σ)`, σ = 0.02 V.
- Update: `b'(f) ∝ b(f) · P(r | f, n)`. Log-space with logsumexp, renormalize, assert finite.
- Instruction: `n* = argmax_n [H(b) − E_r H(b'|r)]`. Expectation by 20-point Gauss-Hermite quadrature (no RNG, so the TS port needs no random-number parity). Ties broken to the lowest index at 1e-12.
- Placement posterior: `P(l | r, n) ∝ P(l|n) · Σ_f b(f) N(r; V_f(l), σ)`. Warn when `P(l ≠ n | r) > PLACEMENT_WARNING_THRESHOLD = 0.5`. `placement_audit` recomputes every past step's placement under the current belief.
- Resolution: top class mass ≥ 0.95 and singleton class -> resolved; ≥ 0.95 but multi-member class -> unresolved (indistinguishable); max gain < 1e-3 bits -> unresolved (no informative site); ≥ 12 steps -> unresolved (max steps); else continue.
- Baselines (shadow mode in sessions, own instructions in experiments): `EntropyExact` (published method), `Checklist`, `RandomOrder`, `RemeasureUntilAgree`.

## Netlist and catalog (scratch reconstruction, labeled)
The netlist below was reconstructed on 2026-10-25 from the six reference voltages; it reproduces them within 0.36 mV. It is the working `DEFAULT_NETLIST` until Pankaj's `circuit.py` arrives, at which point `from_handsight` adapts his and parity is checked.

| Element | Nodes | Value |
|---|---|---|
| BAT | row1 - GND | 9.0 V (`battery_low` = 7.2 V) |
| R1 | row1 - row2 | 1 kΩ |
| R2 | row2 - row3 | 2.2 kΩ |
| R3 | row3 - GND | 2.2 kΩ |
| R4 | row3 - row6 | 4.7 kΩ |
| R5 | row6 - GND | 4.7 kΩ |
| R6 | row2 - row4 | 330 Ω |
| D1 | anode row4, cathode row5 | PWL Vf0 2.0 V, Rs 20 Ω (the (1.8 V, 68 Ω) alternative flips the worked example's step-1 top candidate, contradicting the brief) |
| R7 | row5 - GND | 100 Ω |

GND is the battery negative rail and is not a site. Catalog scheme: `nominal`; `R{1..7}_{open|short|10x_high|10x_low}` (open 1e9 Ω, short 1e-3 Ω); `LED_open`, `LED_short` (1e6 S), `LED_reversed` (no element); `battery_low`.

## Worked example (the demo fixture)
True fault `R3_10x_low`. Told row 3, hand lands row 2, reading 3.671 V; then told row 3 again, reading 0.338 V. Numbers come from `engine/fixtures/parity/worked_example.json` once recorded. Scratch reconstruction (confusion .78/.08/.03, σ .02, uniform prior, H0 5.044 bits): prior EIG by row [0.585 3.278 3.511 3.033 2.692 3.401] -> row 3; after 3.671 V belief R3_short .631, R3_10x_low .345, R7_10x_low .012, H 1.099 bits, published method R2_short 1.000, placement [0 1 0 0 0 0], P(off) 1.0 -> warning; after 0.338 V R3_10x_low .975. The brief expected 63.5% / 97.6%; we show the fixture's numbers, labeled. The engine's own next choice after step 1 is row 6 (0.972 vs 0.868 bits); the fixture records `next_told_site` = row 3 (as in the brief) separately from `engine_choice`. The UI replays it at `/sim?demo=worked-example`.

## Python package layout (plan Appendix A2)
```
engine/
  pyproject.toml            uv-managed; deps: numpy, fastapi, uvicorn, pydantic, pydantic-settings; dev: pytest, pytest-cov, httpx, ruff, pyright
  plumbline/
    config.py               SIGMA_VOLTS, CONFUSION, PLACEMENT_WARNING_THRESHOLD .5, RESOLVE_THRESHOLD .95, MIN_USEFUL_GAIN_BITS 1e-3, CLASS_TOLERANCE_VOLTS 1e-3, MAX_STEPS 12, GH_QUADRATURE_POINTS 20; ConfusionSpec, EngineConfig.resolved(model)
    model.py                Hypothesis, Site, ReadingSpec, InstrumentModel protocol (hypotheses, sites, expected_readings() -> (F,K), phrases)
    confusion.py            banded_confusion(spec, n) -> (K,K); validate_confusion
    engine.py               Engine(model, config): classes, log_likelihood, update, placement, placement_audit, entropy_bits, expected_gain (Gauss-Hermite), choose_instruction, resolution, class_belief
    session.py              Session(model, engine, mode, seed, true_hypothesis, fixture, reveal, truth_confusion, baseline); step(reading|None); reset(); view(include_truth)
    baselines.py            Baseline protocol; EntropyExact, Checklist, RandomOrder, RemeasureUntilAgree
    domains/                __init__ registry {circuit, thermometer}; circuit.py (Resistor, LedModel, Netlist, DEFAULT_NETLIST, solve_nodes, build_catalog, CircuitModel, from_handsight later); thermometer.py (simulated, labeled)
    record_fixtures.py      --only, --out, --force; goes through Session only; refuses silent overwrite
    experiments/            experiment.py N [--seed] [--domain]; stability.py; mismatch.py; sweep.py; mkfigs.py -> docs/results/
    legacy/                 handsight scripts when they arrive + test_legacy_parity.py
  plumbline_api/
    main.py settings.py (pydantic-settings, PLUMBLINE_ prefix) schemas.py errors.py store.py routers/{sessions,domains,health}.py
  fixtures/parity/*.json    recorded sessions for the TS port
  tests/
```

## API v1
The single owner of the contract is `docs/API_CONTRACT.md`. Do not restate schemas here; read that file before changing `plumbline_api/schemas.py` or `apps/web/src/engine/schemas.ts` (the Zod mirror). Endpoint list, prefix `/v1`:
```
GET  /health
GET  /domains
GET  /domains/{domain}/catalog
POST /sessions                      {domain, mode, seed?, true_hypothesis?, fixture?, reveal?, sigma?, confusion?}
GET  /sessions/{id}
POST /sessions/{id}/step            {reading?}   absent in simulate, required in live, optional-must-match in replay
POST /sessions/{id}/reset
```
Sites are 0-based indices with labels; `belief[i]` pairs with `catalog.hypotheses[i]`; `entropy_bits`; `placement {probs, warning {active, p_off_site, likely_site, text}}`; `unresolved {classes, reason, text}`; error envelope `{error: {code, message, details}}` including 422. All floats finite, lists bounded. CORS allowlist from `PLUMBLINE_CORS_ORIGINS`.

## Fixtures and parity protocol (Python -> TypeScript)
1. `uv run --project engine python -m plumbline.record_fixtures` writes `engine/fixtures/parity/{worked_example,seed_1..5,slip_heavy,unresolved_pair,thermometer_demo}.json`. Shape (plan A5): `schema_version, name, domain, mode, generated_by, git_sha, generated_at, config {sigma, confusion, thresholds, quadrature {x, w}}, catalog, true_hypothesis, prior_instruction, steps[{index, told_site, landed_site, reading, belief, entropy_bits, placement, p_off_site, warning, placement_audit, status, engine_choice, next_told_site, baseline, diagnosis?}]`. The recorder refuses to overwrite silently; pass `--force`.
2. Vitest reads the same files through the Vite alias `@fixtures` -> `engine/fixtures/parity` (no copy script, no drift). `apps/web/src/engine/__tests__/parity.test.ts` replays each step and asserts belief, placement, audit and gain within 1e-6, and identical `engine_choice.site`, `status`, `warning`.
3. Until the first real fixture lands, web lanes use a hand-typed provisional fixture under `apps/web/src/fixtures/provisional/`; the UI badges it PROVISIONAL and the production build refuses it.
4. The TS port (`apps/web/src/engine/local/`) may drive the UI only once parity passes on all fixtures; until then the UI calls the API for simulate and live, and replay reads fixtures directly.

## Reproducing the experiment numbers
```
uv run --project engine python -m plumbline.experiments.experiment 400
uv run --project engine python -m plumbline.experiments.stability
uv run --project engine python -m plumbline.experiments.mismatch
uv run --project engine python -m plumbline.experiments.sweep
uv run --project engine python -m plumbline.experiments.mkfigs
```
Each writes `docs/results/<name>_<date>.{md,json}` with the command, git SHA and seeds; figures go to `docs/results/figures/`. The brief's expectations (five seeds, 1500 faults per arm): Truehand 99.0 ± 0.4% correct, 1.0 ± 0.4% confidently wrong; published method 78.7 ± 1.8% / 21.2 ± 1.8%; warnings 176 of 178 correct. They are expectations, not claims, until `stability.py` has run in this repo. If your run differs, report your numbers with the command and seed; never quote the brief as if it were your run.
