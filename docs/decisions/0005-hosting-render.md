# ADR-0005: Hosting on Render: static site (web) + web service (FastAPI); `render.yaml` blueprint in repo

Status: accepted, 2026-10-25

## Context

`docs/ARCHITECTURE.md` v0 (section 7) planned a static build on Vercel or GitHub Pages with the
API running on the demo laptop. That plan does not hold for the finals. The judges need a link
that opens and completes the worked example. The inference engine is Python (ADR-0001), and the
simulate and live modes need the server. The plan's feasibility argument (reality check) says a
deployed site anyone can open is part of the proof, and rule 6 says replay must never fail.

A static host alone cannot run the engine until the TypeScript port passes parity (ADR-0006). A
laptop-only API fails on demo day if the network or the laptop misbehaves. Render can host both a
static site and a Python web service from one blueprint file, which keeps the deploy definition in
the repo and reviewable. The plan records that the Render plugin is installed but not loaded in
the current session, and that the `render` CLI is not installed. Those are operational facts, not
verified in this ADR.

## Decision

A `render.yaml` blueprint in the repo declares two services.

Static site `plumbline-web`:

- Build: `corepack enable && pnpm install --frozen-lockfile && pnpm --filter web build`, with
  `NODE_VERSION` 20.20.0.
- Publish `apps/web/dist`. Rewrite `/*` to `/index.html` for the SPA routes.
- Cache policy: `sw.js` no-cache, hashed assets immutable.
- Header `Permissions-Policy: microphone=(self)` for the voice loop (ADR-0008).

Web service `plumbline-api`:

- `rootDir: engine`, runtime Python, `PYTHON_VERSION` 3.13.x.
- Build: `pip install uv && uv sync --frozen --no-dev`.
- Start: `uv run --no-sync uvicorn plumbline_api.main:app --host 0.0.0.0 --port $PORT`.
- Health check path `/v1/health`. Reconciliation 4 of the plan supersedes the `/health` path that
  Appendix B6 lists.
- Environment: `PLUMBLINE_CORS_ORIGINS` (the static site origin and the Vite dev origin only) and
  `PLUMBLINE_FIXTURES_DIR`.

Plan on the instance type: free during the build. Starter for the semifinal review window and the
finals week, per Reconciliation 4. Sprint 5 says Starter is on by Dec 7. The plan does not give a
single date for the semifinal window, so the switch date is set when Nexus replies.

Fallback: a Dockerfile based on `ghcr.io/astral-sh/uv:python3.13-bookworm-slim`, used if the native
build fails.

The `/sim` page probes `/v1/health` with a 4 second timeout and shows `ok`, `waking`, or `down`. A
`waking` or `down` state shows the sentence "the engine is waking up" and starts replay
automatically (ADR-0006). Replay never needs the API.

The plan states that the free tier sleeps after about 15 minutes idle with a 30 to 60 second cold
start. That figure is from the plan and was not checked against Render's current documentation in
this session. It must be checked before the finals.

This ADR supersedes section 7 of `docs/ARCHITECTURE.md` v0.

## Consequences

Positive:

- One public URL for judges. The site works without the API through replay and, after parity,
  through the local engine.
- The deploy definition is a file in the repo, reviewed like code, with the CORS allowlist and
  the health path written down.

Negative:

- The Starter plan costs money in the review and finals weeks. The budget is the user's decision,
  and the plan does not state an amount in this ADR.
- Cold starts on the free tier can be long enough that the first simulate request is slow. The
  replay fallback covers the demo flow, but the simulate page needs the waking sentence.
- Render's plugin is installed but not loaded until a fresh session, so the day-6 deploy depends on
  a restart the user must perform.

What to re-visit:

- Before Dec 7, check Render's current pricing, sleep behavior, and blueprint syntax against its
  documentation (fetch current docs first, per CLAUDE.md rule 4).
- After the port passes parity (Sprint 3), decide whether `plumbline-api` is still needed for
  simulate and live, or only for the stress and experiment endpoints.
- Confirm the CORS origin list matches the deployed static URL. A mismatch fails silently in the
  browser.

## Alternatives considered

- **Vercel or GitHub Pages with the API on the laptop** (ARCHITECTURE v0). Rejected: a judge who
  opens the link gets no simulate or live mode, and the demo depends on one laptop on one network.
- **Serverless Python functions on a static host.** Not evaluated in detail. It would split the
  engine into a runtime that the blueprint does not describe, and cold starts would still apply.
- **Static only, with the engine ported to TypeScript before the finals.** Kept as the long-term
  path (ADR-0006), not as the only path. The port cannot be trusted until parity passes.
- **Another PaaS (for example Fly.io or Railway).** Not evaluated in this ADR. Render was chosen in
  the plan, and its plugin is already installed for the day-6 deploy.
