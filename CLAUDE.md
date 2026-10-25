# Plumbline

An assistant for blind hands that cannot tell you something it has not measured. It infers the circuit fault and the probe's true position jointly from each reading, warns when "your probe is not where you think it is", and refuses to guess when the physics cannot tell two faults apart. Nexus Technology Cup 2026 (College Track), finals Dec 14-16. Project invariants, the math, and the directory map are in `.claude/rules/00-plumbline.md` (always loaded).

## Stack (decided)
- **Web:** `apps/web` - Vite 8, React 19, TypeScript strict, Tailwind v4, React Three Fiber + drei, Zustand, Zod, react-router, vite-plugin-pwa, vitest, Playwright. pnpm workspace, Node 22 (`.nvmrc`). Light theme default.
- **Engine:** `engine/` - Python 3.13 via uv, NumPy, FastAPI. Rebuilt test-first from the six-line math (ADR-0002); the teammate's `handsight` code becomes the parity reference under `engine/plumbline/legacy/` when it arrives. Contract: `docs/API_CONTRACT.md`.
- **Port:** `apps/web/src/engine` - TypeScript port of the inference math, allowed to drive the demo only after the parity suite passes.
- **Voice:** Web Speech API in `apps/web/src/voice`.

## Commands
```
/bootstrap              scaffold web app + engine + tooling (run once)
/lanes [slice]          parallel worktree lanes with owner agents and merge gates
/verify [--e2e]         typecheck, lint, tests, python, parity, build budget, secrets -> PASS/FAIL table
/demo-worked-example    replay the 3.671 V -> 0.338 V story against the API/UI
pnpm dev | pnpm api     web dev server | FastAPI on :8000
```

## How to work here
1. Read the current sprint in `docs/BUILD_PLAN.md`; architecture in `docs/ARCHITECTURE.md`; HTTP contract in `docs/API_CONTRACT.md`; site framing and copy rules in `docs/POSITIONING.md` and `docs/DESIGN_REFERENCES.md`; decisions in `docs/decisions/`.
2. Complex or multi-directory work: `planner` agent first, then `/lanes`. One lane = one worktree = one write surface.
3. Logic is test-first (`tdd-guide`). Scene work goes to `three-engineer`, visual direction to `ui-designer`, numbers to `engine-scientist`, and every UI change gets an `a11y-auditor` pass. `code-reviewer` after each lane.
4. Before using an R3F/drei/Tailwind/FastAPI API you have not used in this repo, fetch current docs with `npx ctx7@latest docs <id> "<topic>"`.
5. `/verify` before merge. Conventional commits. Never `--no-verify` (hook blocks it).
6. Numbers shown to anyone come from a command run in this repo or a cited paper. Simulated means labeled simulated.

## Hooks in effect (lean profile)
Format on edit (prettier/ruff), tsc + ruff warnings as context, design-quality nudge on UI files, config-protection block, `--no-verify` and force-push-to-main block, session briefing on start, macOS notification on stop. Details and off switches: `docs/CLAUDE_SETUP.md`.

## Do not build
Accounts, databases, analytics dashboards, a separate native mobile codebase, cloud state, auth. A Capacitor wrapper of the same web app for iOS is allowed at the finals (ADR-0009). An env-flag passphrase gate for private previews is allowed (no accounts). See rule 5 in `.claude/rules/00-plumbline.md`.
