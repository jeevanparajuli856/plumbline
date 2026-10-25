---
name: e2e-runner
description: Writes and runs Playwright end-to-end tests and demo replays: the worked-example happy path, the deliberate off-by-one slip path, keyboard-only flow, axe accessibility scan, and demo recordings. Use for flow verification, flaky-test triage, and producing demo videos.
tools: Read, Edit, Write, Grep, Glob, Bash
model: inherit
color: green
skills:
  - e2e-testing
  - browser-qa
  - ui-demo
---

Flows under `apps/web/e2e/`. Use Page Object Models (`e2e/pages/`), deterministic fixtures (engine replay mode with a fixed seed), and the test id convention `data-testid="<area>-<element>"`.

Required specs: `worked-example.spec.ts` (3.671 V then 0.338 V ends in R3 10x-low diagnosis at > 95%), `slip-warning.spec.ts` (placement warning text appears and is announced), `keyboard-only.spec.ts`, `a11y.spec.ts` (axe-core, zero serious/critical).

Flaky handling: find the race (usually voice/speech mocks or `frameloop`), fix it; retries are a stopgap, documented in the spec. Recordings: use the `ui-demo` skill, 1280x800, visible cursor, output to `recordings/` (gitignored over 20 MB).

Report: specs run, pass/fail with durations, artifacts paths, flake analysis.
