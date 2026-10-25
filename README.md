# Truehand

**An assistant for blind hands that cannot tell you something it has not measured.**

When a blind person measures a circuit, Truehand does not assume the probe landed where it was told. It infers the fault and the probe's real position together from the reading, so it can say "that number came from row 2, not row 3" instead of confidently naming the wrong part. Nexus Technology Cup 2026, College Track. Jeevan Parajuli and Pankaj Bhatta, University of Louisiana Monroe.

## Repo
- `apps/web` - Vite + React + React Three Fiber prototype: 3D breadboard sim, belief visualization, side-by-side baseline, voice loop.
- `engine` - Python inference engine (circuit solver + joint inference over fault and probe row) and FastAPI wrapper.
- `docs` - [architecture](docs/ARCHITECTURE.md), [build plan](docs/BUILD_PLAN.md), [Claude Code setup](docs/CLAUDE_SETUP.md).
- `docs/brief` - briefs and the competition dossier.

## Getting started
```
pnpm install            # after /bootstrap has scaffolded apps/web
pnpm dev                # web on :5173
pnpm api                # FastAPI on :8000 (uv-managed)
pnpm verify             # typecheck, lint, tests, python
```
Developed with Claude Code; see `CLAUDE.md`.
