---
name: verify
description: Run the Plumbline verification loop and produce a PASS/FAIL table - install sanity, TypeScript typecheck, eslint, vitest with coverage, Python ruff + pyright + pytest, engine parity fixtures, Playwright smoke (optional), bundle budget, secret grep, diff review. Use before any merge, PR, or demo freeze.
argument-hint: "[--e2e] [--quick]"
allowed-tools: Bash, Read, Grep, Glob
---

# /verify

Shell setup first: `eval "$(fnm env --shell zsh)" && fnm use 22` (Node 22 is required). Health path is `/v1/health`.

Adapted from ECC `verification-loop` for this repo. Run every phase that applies; stop early only on a build failure. Paste the last lines of each command; never summarize a failure as "some tests failed".

| # | Phase | Command | Pass condition |
|---|---|---|---|
| 1 | Install | `pnpm install --frozen-lockfile` (skip with --quick) | exit 0 |
| 2 | Typecheck | `pnpm -r typecheck` | 0 errors |
| 3 | Lint | `pnpm -r lint` | 0 errors (warnings listed) |
| 4 | Unit (web) | `pnpm --filter web test -- --run --coverage` | all pass; coverage per `.claude/rules/testing.md` |
| 5 | Python | `uv run --project engine ruff check engine && uv run --project engine pyright engine/plumbline engine/plumbline_api && uv run --project engine pytest -q --cov=plumbline --rootdir engine engine/tests` | all pass |
| 6 | Parity | `pnpm --filter web test -- --run src/engine/__tests__/parity.test.ts` (if the TS port exists) | max abs error < 1e-6 |
| 7 | Build | `pnpm --filter web build` | exit 0; report gzip sizes of main and three chunks vs budget |
| 8 | E2E | `pnpm test:e2e` (only with --e2e) | worked-example, slip-warning, keyboard-only, a11y specs pass |
| 9 | Secrets | `git grep -nE "(sk-[A-Za-z0-9]{10,}|AKIA[0-9A-Z]{16}|BEGIN (RSA|EC) PRIVATE KEY)" -- . ':!*.lock'` | no matches |
| 10 | Diff review | `git diff --stat main...HEAD` and read the diff for console.log, TODO without owner, scope creep | none |

Output exactly:
```
## Verification: PASS | FAIL
| Phase | Result | Evidence (last line / numbers) |
...
Blocking issues: <list or none>
```
If a phase's tool is not installed yet (pre-bootstrap), mark it SKIPPED with the reason, not PASS.
