---
name: demo-worked-example
description: Replay the Truehand worked example end to end (true fault R3 10x low, told row 3, hand lands row 2, 3.671 V then 0.338 V) against the engine API v1 and, when available, the web UI, and report whether Truehand warns, re-asks, and diagnoses correctly while the published baseline confidently fails. Use before demos, after engine changes, and to generate the side-by-side numbers.
argument-hint: "[--api-only] [--ui]"
allowed-tools: Bash, Read, Grep, Glob
---

# /demo-worked-example

The 20-second story judges must see. Numbers must come from this run, not from the brief. Contract: `docs/API_CONTRACT.md`.

## API replay
1. Start the API if not running: `uv run --project engine uvicorn plumbline_api.main:app --port 8000 &` and wait for `GET /v1/health` to return 200.
2. `POST /v1/sessions {"domain": "circuit", "mode": "replay", "fixture": "worked_example"}` -> record `session_id`; confirm `instruction.site == 2` (0-based) with label "row 3".
3. `POST /v1/sessions/{id}/step {"reading": 3.671}` -> expect `placement.warning.active == true`, `status == "continue"`, `baseline.diagnosis.confidence` at or above 0.99 on a wrong hypothesis (scratch: `R2_short`), and Truehand's top `belief` entry below 0.9 (scratch: `R3_short` 0.631). Record `placement.warning.text`.
4. `POST /v1/sessions/{id}/step {"reading": 0.338}` -> expect `status == "resolved"`, `diagnosis.hypothesis_id == "R3_10x_low"`, `diagnosis.confidence > 0.95` (scratch: 0.975).
5. Print a table: step, reading, Truehand top hypothesis + confidence, baseline top hypothesis + confidence, warning text. Hypothesis ids map to labels through `catalog.hypotheses[i]`.

A `409 fixture_mismatch` means the reading sent does not match the fixture's recorded reading within 1e-3 V; report it, do not change the reading.

## UI replay (--ui)
Run `pnpm --filter web test:e2e -- --grep worked-example` and, if a browser tool is available, open `http://localhost:5173/sim?demo=worked-example`, press `P` to play (or `]` to step), and capture a screenshot after the warning banner and after the diagnosis card. Also run once with `&view=text` to confirm the text channel alone completes the flow.

## Report
```
## Worked example: PASS | FAIL
| Step | Reading | Truehand | Baseline | Warning |
Diagnosis correct: yes/no   Baseline confidently wrong: yes/no   Warning fired at step 1: yes/no
Fixture: engine/fixtures/parity/worked_example.json  git_sha: ...  generated_at: ...
Commands run: ...
```
Any deviation from the brief's expectations (63.5%, 97.6%, 100.0%) or from the scratch reconstruction (63.1%, 97.5%, 100.0%) is reported as-is with the fixture's `git_sha`; do not "fix" the fixture to match either.
