# ADR-0001: Stack: Vite + React 19 + TS strict + Tailwind v4 + R3F/drei + Zustand + Zod; Python 3.13/uv/NumPy/FastAPI

Status: accepted, 2026-10-25

## Context

Truehand has two halves that must agree on one set of numbers. The browser experience is the
blind user's main channel (text, keyboard, voice) and also carries a 3D scene for sighted judges.
The inference engine is a circuit solver plus a Bayesian update over faults. The brief (section 6)
names the Python modules that exist in the original work: `circuit.py`, `engine.py`,
`experiment.py`, `stability.py`, `mkfigs.py`. The brief's 24-hour list (section 7) asks for a voice
loop, a working circuit, and no accounts, database, dashboard, or cloud work.

The Nexus criteria (as summarized in the plan's reality check) reward "show something working,
input to output", and a deployed site that anyone can open. Judges also punish a mockup with no
real path. That forces a real numerical core in Python with tests, a browser client that can run
without the server, and a 3D scene that lives in the same React tree as the DOM panels so the two
channels cannot drift apart.

Two repository facts shape the choice. The root workspace already exists (`package.json` with
`verify`, `api`, and `dev` scripts; `pnpm-workspace.yaml` with `apps/*`). The `apps/` and `engine/`
folders hold no source yet, only `engine/README.md`. The stack must therefore be chosen before
code exists, and each library must be fetched from current docs before first use (CLAUDE.md rule 4).

## Decision

Web (`apps/web`, pnpm workspace):

- Vite, React 19, TypeScript in strict mode.
- Tailwind v4 with `@theme inline` mapping the design tokens to `--color-*` variables.
- React Three Fiber and drei for the scene.
- Zustand for the session store. Zod validates browser-side input and mirrors the API schemas.
- vitest for unit tests and Playwright for end-to-end runs.
- Added in Sprint 0 (plan, Sprint 0 item 2 and Appendix B3): react-router v7 (SPA routes),
  vite-plugin-pwa (ADR-0009), motion, fontsource for self-hosted fonts, eslint-plugin-jsx-a11y,
  and size-limit for the bundle budget.

Engine (`engine/`, Python 3.13 via uv):

- NumPy for the circuit solver and the inference math.
- FastAPI with Pydantic v2 models at every request boundary, and pydantic-settings for the
  `PLUMBLINE_` environment prefix.
- pytest for the Python suite and httpx with `ASGITransport` for API tests.
- Flat layout: `engine/plumbline` (the package) and `engine/plumbline_api` (the FastAPI app),
  built with a hatch build configuration.

Versions are pinned by lockfiles committed at bootstrap. CI and deploy install with
`pnpm install --frozen-lockfile` and `uv sync --frozen`. This ADR does not pin major versions
beyond the ones named above, because the plan did not record them and they were not checked in
this session.

## Consequences

Positive:

- One language for the UI (TypeScript) and one for the numerics (Python with NumPy). The 3D scene
  and the DOM twin share one React tree and one store.
- The deploy shape stays small: one static site and one Python service (ADR-0005).
- The stack matches the rules in `.claude/rules/` and the existing root scripts.

Negative:

- Two languages and two test runners. The TypeScript port (ADR-0006) is a second implementation
  of the math and needs the parity gate to stay honest.
- Three libraries (react-router v7, vite-plugin-pwa, fontsource) are added after the first plan,
  so the Sprint 0 bootstrap must prove they install before any lane starts.

What to re-visit:

- If the port needs the Python solver in the browser, the choice between a TypeScript port and
  a WebAssembly build of Python must be reopened (see ADR-0006 alternatives).
- If an R3F or drei major version changes the `useFrame` or `Canvas` API, the scene lane must
  fetch current docs before it changes code.
- Re-base when Pankaj's handsight code arrives. The stack decision does not depend on it, but if
  handsight depends on a numeric library beyond NumPy (for example SciPy), a new decision is
  needed to add it to `engine/`.

## Alternatives considered

- **Next.js.** Server rendering and API routes in one app. Rejected: the replay must work with the
  API asleep, the landing is a client-side scroll choreography (ADR-0007), and a second server
  runtime adds a deploy surface with no benefit to the demo.
- **Python-only UI (Streamlit or Dash).** Rejected: the aria-live twin, the keyboard map, focus
  management, and a Canvas with a DOM twin (ADR-0008) are poor fits for these frameworks.
- **Plain Three.js without React.** Rejected: the UI state (store, panels, voice machine) is already
  React-shaped, and R3F keeps the scene in the same tree as the panels.
- **Flask or Django for the API.** Rejected: Flask needs hand-rolled validation at each boundary
  (security rule: validate every body), and Django brings database and auth scaffolding that
  `00-plumbline.md` rule 5 forbids.
