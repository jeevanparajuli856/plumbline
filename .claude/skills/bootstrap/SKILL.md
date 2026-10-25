---
name: bootstrap
description: Scaffold the Plumbline monorepo from scratch - pnpm workspace, Vite + React 19 + TypeScript + Tailwind + React Three Fiber + Zustand web app with vitest and Playwright, uv-managed Python engine package with FastAPI, shared scripts, and a first green /verify. Run once after the .claude setup, before any lane starts.
disable-model-invocation: true
argument-hint: "[--skip-engine] [--skip-web]"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# /bootstrap

Goal: a repo where `pnpm verify` and `uv run --project engine pytest` are green, the web app renders a placeholder Canvas, and the API answers `/health`. Follow `docs/ARCHITECTURE.md` for the layout. Confirm each command's output; do not assume success.

## 0. Preconditions
- Node 20+, pnpm 9+, uv, git initialized. `gh auth status` active account is the repo owner.
- Read `docs/ARCHITECTURE.md` and `.claude/rules/00-plumbline.md`.

## 1. Workspace root (if not already present)
`pnpm-workspace.yaml` with `apps/*`, root `package.json` scripts: `dev`, `build`, `test`, `test:e2e`, `typecheck`, `lint`, `format`, `verify`, `api`. Root dev deps: `prettier`, `typescript`, `concurrently`.

## 2. Web app
```
pnpm create vite apps/web --template react-ts
cd apps/web && pnpm add three @react-three/fiber @react-three/drei zustand zod
pnpm add -D @types/three tailwindcss @tailwindcss/vite vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @react-three/test-renderer @playwright/test @axe-core/playwright eslint-plugin-react-hooks r3f-perf
```
Then: Tailwind v4 via `@tailwindcss/vite` and `@import "tailwindcss"` in `src/styles/index.css`; `src/styles/tokens.css` with the palette from `.claude/rules/web-design-quality.md`; path alias `@/`; `vite.config.ts` with `manualChunks` splitting `three` and R3F; folders `scene/ state/ engine/ voice/ a11y/ ui/ lib/`; a `SceneRoot` that renders a lit placeholder breadboard slab; `LiveRegion` component mounted in `App`; vitest config (`environment: jsdom`, setup file); Playwright config with `webServer` and one smoke spec; `.env.example` with `VITE_API_URL=http://localhost:8000`.
Check with ctx7 if a Tailwind v4 / Vite 7 / R3F v9 API differs from memory: `npx ctx7@latest library "Tailwind CSS" "Vite plugin setup v4"`.

## 3. Engine
```
mkdir -p engine && cd engine && uv init --package --name plumbline --python 3.13
uv add numpy fastapi "uvicorn[standard]" pydantic pydantic-settings
uv add --dev pytest pytest-cov httpx ruff pyright
```
Create `plumbline/config.py`, `plumbline/session.py` stub, `plumbline_api/main.py` with CORS and `/health`, `tests/test_health.py`. If `handsight` files are present in `engine/` or given as a path, move them to `plumbline/` and add an import smoke test; otherwise leave clear TODO markers and a `plumbline/README.md` describing where they go.

## 4. Tooling and hooks
- `.prettierrc`, `eslint.config.js` (flat, TS + react-hooks), `ruff.toml` (line-length 100, select E,F,I,UP,B).
- Confirm hooks fire: edit a `.tsx` file and observe the format hook; run a `--no-verify` dry command and confirm the block.
- Add `.worktreeinclude` with `.env` and `apps/web/.env.local`.

## 5. First verification and commit
```
pnpm install && pnpm verify
uv run --project engine pytest -q
git add -A && git commit -m "chore: bootstrap web app, engine package, tooling"
```
Report: versions installed, commands and their last lines, what is still TODO (handsight code, fixtures).
