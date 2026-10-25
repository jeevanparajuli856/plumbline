---
name: demo-worked-example
description: Replay the Plumbline worked example end to end (true fault R3 10x low, told row 3, hand lands row 2, 3.671 V then 0.338 V) against the engine API and, when available, the web UI, and report whether Plumbline warns, re-asks, and diagnoses correctly while the published baseline confidently fails. Use before demos, after engine changes, and to generate the side-by-side numbers.
argument-hint: "[--api-only] [--ui]"
allowed-tools: Bash, Read, Grep, Glob
---

# /demo-worked-example

The 20-second story judges must see. Numbers must come from this run, not from the brief.

## API replay
1. Start the API if not running: `uv run --project engine uvicorn plumbline_api.main:app --port 8000 &` and wait for `/health`.
2. `POST /sessions {mode:"replay", fixture:"worked_example"}` -> confirm the first instruction is row 3.
3. `POST /sessions/{id}/readings {volts: 3.671}` -> expect `warning.active == true`, `status == "continue"`, baseline diagnosis present with confidence ≈ 1.0 on the wrong fault, Plumbline top belief < 0.9.
4. `POST /sessions/{id}/readings {volts: 0.338}` -> expect `status == "resolved"`, diagnosis fault = R3 10x low, confidence > 0.95.
5. Print a table: step, reading, Plumbline top fault + confidence, baseline top fault + confidence, warning text.

## UI replay (--ui)
Run `pnpm test:e2e -- --grep worked-example` and, if a browser tool is available, open `http://localhost:5173/?demo=worked-example`, step through with the keyboard, and capture a screenshot after the warning and after the diagnosis.

## Report
```
## Worked example: PASS | FAIL
| Step | Reading | Plumbline | Baseline | Warning |
Diagnosis correct: yes/no   Baseline confidently wrong: yes/no
Commands run: ...
```
Any deviation from the brief's numbers (63.5%, 97.6%, 100.0%) is reported as-is with the fixture hash; do not "fix" the fixture to match the brief.
