# Plumbline architecture

Status: v0, written 2026-10-25 before `/bootstrap`. Update through the `doc-updater` agent when code lands.

## 1. Shape

```
┌───────────────────────────── apps/web (Vite, React 19, TS) ─────────────────────────────┐
│  ui/        DOM panels: instruction, reading input, warning banner, belief chart, log     │
│  a11y/      LiveRegion + announce(); keyboard map                                         │
│  voice/     Web Speech loop (speak / listen / parse / machine)                            │
│  state/     Zustand session store (single source of UI truth)                             │
│  scene/     React Three Fiber: breadboard, components, probe, noisy hand, belief overlay  │
│  engine/    TS port of the math + parity tests (drives demo only after parity passes)     │
│  lib/api.ts HTTP client -> FastAPI                                                        │
└───────────────────────────────────────────┬──────────────────────────────────────────────┘
                                            │ JSON over HTTP (localhost:8000)
┌───────────────────────────────────────────▼──────────────────────────────────────────────┐
│ engine/ (Python 3.13, uv)                                                                 │
│  plumbline_api/   FastAPI: sessions, readings, catalog, health (in-memory sessions)       │
│  plumbline/       config, circuit (MNA solver, 33 faults, row map), engine (likelihoods,  │
│                   info gain, placement posterior), session state machine, baselines       │
│  fixtures/parity/ recorded sessions shared by pytest and vitest                           │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

Two run modes matter for the demo:
- **simulate**: the server samples where the hand lands from the confusion model with a seed; the reading is computed from the circuit solver plus meter noise. Used for development, the 3D sim, and the baseline comparison.
- **live**: a human reads a real meter and speaks or types the number; the server never knows the true landed row and reasons exactly as it would for a blind user.
- **replay**: deterministic fixture playback (the worked example). Always available, never depends on speech or hardware.

## 2. Data flow for one step
1. UI shows and speaks `instruction.row`. Scene outlines that row.
2. User produces a reading (voice -> `parseReading`, keyboard, or simulated). Store: `phase = submitting`.
3. `POST /sessions/{id}/readings {volts}`. Server marginalizes over landed rows, updates belief, computes placement posterior and warning, picks next instruction by expected information gain, runs the baseline arm on the same reading.
4. Store receives the response. Scene animates the probe to the revealed landed row (simulate/replay) or keeps it at the instructed row with the placement posterior glow (live). Belief chart and plumb-line pendulum update. `announce()` mirrors the event. Voice speaks warning or next instruction.
5. `status` resolved -> diagnosis card + spoken sentence; unresolved -> refusal sentence and the unresolved pair.

## 3. State model (Zustand `src/state/session.ts`)
```ts
interface SessionState {
  sessionId: string | null
  mode: 'simulate' | 'live' | 'replay'
  phase: 'idle' | 'awaiting_reading' | 'submitting' | 'resolved' | 'unresolved' | 'error'
  instruction: { row: Row } | null
  readings: Array<{ row: Row; volts: number; landedRow?: Row; warning: Warning | null }>
  belief: number[]                 // length = catalog length, sums to 1
  entropyBits: number
  placement: number[]              // length 6, sums to 1
  warning: Warning | null          // { pOffRow: number; text: string }
  diagnosis: { fault: FaultId; confidence: number } | null
  baseline: { belief: number[]; diagnosis: { fault: FaultId; confidence: number } | null }
  catalog: FaultMeta[]
  // actions
  start(mode, opts): Promise<void>; aimProbe(row): void; submitReading(volts): Promise<void>; reset(): void
}
```
Scene components read via selectors or `getState()` inside `useFrame`. UI panels use selectors. The voice machine is a pure reducer fed by store events.

## 4. API contract
See skill `plumbline-engine`, section "API contract (v0)". Pydantic models in `engine/plumbline_api/schemas.py` are the source; a generated `apps/web/src/lib/api.types.ts` (via a small script or hand-maintained Zod schemas) mirrors them. Breaking changes bump the path prefix (`/v1`).

## 5. Scene composition
See skill `threejs-r3f`. Units in meters, breadboard pitch 2.54 mm, camera 35° fov. Holes instanced, highlighted rows instanced separately, probe animated by ref, `frameloop="demand"` when idle. Nothing informational lives only in 3D.

## 6. Parallel lanes and write surfaces
| Lane | Write surface | Owner agent |
|---|---|---|
| engine-core | `engine/plumbline/**`, `engine/tests/**`, `engine/fixtures/**` | engine-scientist |
| engine-api | `engine/plumbline_api/**`, `engine/tests/test_api*.py` | engine-scientist |
| web-shell | `apps/web/src/{ui,a11y,state,lib}/**`, `apps/web/src/App.tsx`, styles | ui-designer + tdd-guide |
| scene | `apps/web/src/scene/**` | three-engineer |
| ts-port | `apps/web/src/engine/**` | engine-scientist / tdd-guide |
| voice | `apps/web/src/voice/**` | tdd-guide + a11y-auditor |
| e2e | `apps/web/e2e/**`, `playwright.config.ts` | e2e-runner |
| docs | `docs/**`, `README.md` | doc-updater |
Shared files (`package.json`, `vite.config.ts`, `tokens.css`, store types) change only on `main` or through a named "integration" lane.

## 7. Deployment (later, not now)
Static web build to Vercel or GitHub Pages; the API runs on the demo laptop. The replay mode plus the TS port make the deployed site self-sufficient without the API. No cloud state.

## 8. Decisions log
ADRs go in `docs/decisions/NNNN-<slug>.md` via the `architect` agent. Decided so far: stack (Vite/R3F/Tailwind/Zustand), FastAPI wrapper + parity-gated TS port, Web Speech API, lean hooks, worktree lanes.
