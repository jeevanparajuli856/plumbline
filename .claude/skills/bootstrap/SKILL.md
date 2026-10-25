---
name: bootstrap
description: Scaffold the Plumbline monorepo from scratch - pnpm workspace, Vite + React 19 + TypeScript + Tailwind + React Three Fiber + Zustand web app with vitest and Playwright, uv-managed Python engine package with FastAPI, shared scripts, and a first green /verify. Run once after the .claude setup, before any lane starts.
disable-model-invocation: true
argument-hint: "[--skip-engine] [--skip-web]"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# /bootstrap

Goal: a repo where `pnpm verify` and `uv run --project engine pytest` are green, the web app renders a placeholder Canvas, and the API answers `/health`. Follow `docs/ARCHITECTURE.md` for the layout. Confirm each command's output; do not assume success.

## Status
Bootstrap was executed on 2026-10-25 (Sprint 0). The notes below record what was done and the fixes
found along the way, so a rebuild or a new lane can repeat it. Do not run the create-vite step again.

## 0. Preconditions
- Node 22 (fnm, `.nvmrc` = 22; vitest 5 and react-router 8 require >= 22.12), pnpm 9.15 via corepack, uv, git. `gh auth status` active account is the repo owner.
- In every shell: `eval "$(fnm env --shell zsh)" && fnm use 22` before pnpm.
- `UV_PROJECT=engine` is set in settings; when running uv from inside `engine/` prefix with `env -u UV_PROJECT`.
- Set `PLUMBLINE_ALLOW_CONFIG_EDIT=1` only when the scaffold must change an existing eslint/prettier/ruff config.
- Read `docs/ARCHITECTURE.md`, `docs/API_CONTRACT.md`, `docs/POSITIONING.md` and `.claude/rules/00-plumbline.md`.

## 1. Workspace root (if not already present)
`pnpm-workspace.yaml` with `apps/*`, root `package.json` scripts: `dev`, `build`, `test`, `test:e2e`, `typecheck`, `lint`, `format`, `verify`, `api`. Root dev deps: `prettier`, `typescript`, `concurrently`.

## 2. Web app
Scaffolded by hand (no create-vite) with versions pinned in `apps/web/package.json` and the lockfile:
Vite 8 (rolldown), @vitejs/plugin-react 6, React 19.3, TypeScript 5.9 (not 7), three 0.186, R3F 9.8, drei 10.7,
zustand 5, zod 4, react-router 8, motion 14, vite-plugin-pwa 2, Tailwind 4.3, vitest 5, Playwright 1.64,
eslint 9 + typescript-eslint 8 + jsx-a11y, fontsource IBM Plex Sans + JetBrains Mono, size-limit.
`r3f-perf` is NOT installed (it pins drei 9 and React 18). Vite 8 `manualChunks` must be a function.
Done: Tailwind v4 via `@tailwindcss/vite`, `@theme inline` mapping tokens in `src/styles/index.css`; `src/styles/tokens.css` (light default, dark, hc); aliases `@/` and `@fixtures/` (-> `engine/fixtures`); folders `scene/ state/ engine/ voice/ a11y/ ui/ lib/ landing/ sim/ evidence/ about/ fixtures/provisional/`; one lazy app-level Canvas (`scene/SceneHost.tsx` + `SceneRoot.tsx` placeholder slab); `LiveRegion` + `announcer.ts` mounted in `App`; frozen contracts `state/types.ts`, `engine/{client,api,schemas}.ts`, `state/{session,replay,domains,landing,prefs}.ts`; provisional worked-example fixture; react-router routes `/`, `/sim`, `/evidence`, `/about` with the optional `PreviewGate`; vitest (jsdom) and Playwright (chromium + webkit, preview server on 4173); `.env.example`. File names must not collide case-insensitively (macOS): `liveQueue.ts` vs `LiveRegion.tsx`.
Check with ctx7 if a Tailwind v4 / Vite 7 / R3F v9 API differs from memory: `npx ctx7@latest library "Tailwind CSS" "Vite plugin setup v4"`.

## 3. Engine
Done by hand (not `uv init --package`, which creates a `src/` layout): flat `engine/plumbline/` and `engine/plumbline_api/` with a hatchling `pyproject.toml` listing both packages, `ruff.toml`, `uv.lock`. Deps: numpy, fastapi, uvicorn[standard], pydantic, pydantic-settings; dev: pytest, pytest-cov, httpx, ruff, pyright. Present: `plumbline/config.py` (named constants, ConfusionSpec, EngineConfig), `plumbline_api/{settings,main}.py` (CORS from `PLUMBLINE_CORS_ORIGINS`, `/v1/health`), `tests/test_health.py`, `tests/test_config.py`. The engine lane adds everything in docs/ARCHITECTURE.md section 4 and 5. When `handsight` arrives it goes to `plumbline/legacy/` unchanged with a parity test.

## 4. Tooling and hooks
- `.prettierrc` (root), `apps/web/eslint.config.js` (flat: TS + react-hooks + react-refresh + jsx-a11y, no-console error, unused vars allowed with `_` prefix), `engine/ruff.toml` (line-length 100, select E,F,I,UP,B), `render.yaml` at the root.
- Confirm hooks fire: edit a `.tsx` file and observe the format hook; run a `--no-verify` dry command and confirm the block.
- Add `.worktreeinclude` with `.env` and `apps/web/.env.local`.

## 5. First verification and commit
```
pnpm install && pnpm verify
uv run --project engine pytest -q
git add -A && git commit -m "chore: bootstrap web app, engine package, tooling"
```
Report: versions installed, commands and their last lines, what is still TODO (handsight code, fixtures).
