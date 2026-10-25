# Agents and parallel execution

Project subagents live in `.claude/agents/`. Invoke with the Agent tool and `subagent_type: "<name>"`.

| Agent | Use when |
|---|---|
| `planner` | A slice or feature needs decomposition into lanes with acceptance criteria |
| `architect` | A boundary decision: engine API shape, state model, scene structure |
| `tdd-guide` | Any engine, port, state, or voice logic. Writes the failing test first |
| `three-engineer` | Anything under `apps/web/src/scene/` (R3F, drei, performance, picking) |
| `ui-designer` | Design direction, tokens, layout, polish, motion, "it looks generic" |
| `engine-scientist` | Python inference, circuit solver, parity between Python and TS, experiment numbers |
| `a11y-auditor` | Screen-reader flow, aria-live mirror, keyboard, voice fallbacks, contrast |
| `code-reviewer` | Immediately after a lane produces a diff |
| `security-reviewer` | FastAPI endpoints, CORS, input validation, anything touching secrets |
| `build-error-resolver` | Build, type, or dependency failures |
| `e2e-runner` | Playwright flows, demo replay, flaky tests |
| `doc-updater` | ARCHITECTURE/BUILD_PLAN drift, API contract docs, README |

## Proactive use (no prompt needed)
- Complex request -> `planner` first.
- Code just written -> `code-reviewer`.
- Anything in `scene/` -> `three-engineer`; anything numeric -> `engine-scientist`.

## Parallelism
- Independent reads and checks go out in one message.
- Independent write lanes run in separate worktrees (`isolation: "worktree"` on the Agent tool, or `claude -w <lane>` sessions). Write surfaces must not overlap.
- Agent teams (experimental) are enabled via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `.claude/settings.json`; use `/lanes` to shape the team.

## Delegation completion contract (from ECC)
1. Your final message IS the deliverable. Never end a turn "waiting for background agents".
2. If you delegate, you own collection: wait, integrate, verify, then return.
3. Decompose only when the work cannot fit one context. Depth is an outcome, not a plan.
4. Pass the relevant rule and skill conventions into every subagent prompt; they do not inherit your context unless forked.
