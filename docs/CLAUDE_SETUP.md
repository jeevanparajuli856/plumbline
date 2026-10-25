# Claude Code setup for Truehand

What is installed in `.claude/`, why, how to use it, and how to turn pieces off. Verified against Claude Code 2.1.310 docs on 2026-10-25 (hooks, rules, sub-agents, skills, worktrees, agent-teams, permissions, statusline pages at code.claude.com/docs).

## Layout
```
CLAUDE.md                     short constitution (< 100 lines); points to rules and docs
.claude/
  settings.json               permissions allowlist, env, hooks (lean), status line, agent-teams flag
  rules/                      always-on + path-scoped standards (see table)
  agents/                     12 project subagents
  skills/                     31 skills: 24 curated from ECC + 7 written for this repo
  hooks/                      self-contained Node scripts (no plugin dependency)
docs/                         ARCHITECTURE.md, BUILD_PLAN.md, this file, decisions/
docs/brief/                   original briefs and the Nexus dossier (reference only)
ECC-Claude/                   vendored ECC snapshot, gitignored; source for future pulls
```

## Rules (`.claude/rules/`)
| File | Loads | Source |
|---|---|---|
| `00-truehand.md` | always | written here: invariants, math, map, scope |
| `coding-style.md`, `testing.md`, `git-workflow.md`, `agents.md`, `security.md` | always | adapted from ECC `rules/common/*` |
| `typescript.md` | `**/*.ts(x)` | ECC `rules/typescript/*` condensed |
| `react.md` | `**/*.tsx`, hooks | ECC `rules/react/*` condensed, Vite SPA specifics |
| `python.md` | `**/*.py`, pyproject | ECC `rules/python/*` + uv/ruff/pyright |
| `web-design-quality.md` | `apps/web/**` UI files | ECC `rules/web/design-quality.md` + `performance.md`, with the Truehand design direction fixed |
| `three-r3f.md` | `apps/web/src/scene/**` | written here, checked against R3F/drei docs via Context7 |
Path-scoped rules use `paths:` frontmatter and load when a matching file is read or edited.

## Agents (`.claude/agents/`)
planner, architect, tdd-guide, three-engineer, ui-designer, engine-scientist, a11y-auditor, code-reviewer, security-reviewer, build-error-resolver, e2e-runner, doc-updater. Each has a narrow contract and a deliverable format; `agents.md` says when each is used proactively. ECC ships its agents only inside the `ecc@ecc` plugin, so these were written in ECC's format rather than copied.

## Skills (`.claude/skills/`)
From ECC (unchanged): accessibility, browser-qa, design-system, e2e-testing, fastapi-patterns, frontend-a11y, frontend-design-direction, frontend-patterns, git-workflow, make-interfaces-feel-better, motion-foundations, motion-patterns, parallel-execution-optimizer, python-patterns, python-testing, react-patterns, react-performance, security-review, strategic-compact, tdd-workflow, team-agent-orchestration, ui-demo, verification-loop, vite-patterns.
Written for Truehand: `threejs-r3f` (with Context7 snapshots in `references/`), `truehand-engine`, `voice-loop`, and the slash workflows `bootstrap`, `lanes`, `verify`, `demo-worked-example` (user-invoked only).

## Hooks (lean profile)
| Event | Script | Behavior |
|---|---|---|
| SessionStart | `session-start.js` | prints branch, lane, dirty count, bootstrap state, days to finals into context |
| PreToolUse Bash | `pre-bash-guard.js` | blocks `--no-verify`, force-push to main, recursive delete of a root; warns on push and foreground dev servers |
| PreToolUse Edit/Write | `pre-edit-config-protection.js` | blocks edits to existing eslint/prettier/ruff/biome configs and ignore files (`TRUEHAND_ALLOW_CONFIG_EDIT=1` to bypass once) |
| PostToolUse Edit/Write | `post-edit-format.js` | prettier for web files, ruff format for Python; silent if missing |
| PostToolUse Edit/Write | `post-edit-check.js` | incremental `tsc` and `ruff check` scoped to the edited file, console.log warning; returned as context, never blocks |
| PostToolUse Edit/Write | `post-edit-design-quality.js` | ECC's generic-template heuristics on UI files |
| Stop | `stop-notify.js` | macOS notification with the first line of the reply |
| statusLine | `statusline.js` | `truehand ⟂ model | branch (lane) | ctx %` |
Design notes: PostToolUse stderr on exit 0 is not shown to the model, so warning hooks return `hookSpecificOutput.additionalContext`. Blocking hooks use exit 2. All scripts fail open on bad input.
Turn a hook off: delete its entry in `.claude/settings.json` or override in `.claude/settings.local.json` (git-excluded). The ECC strict extras (pre-commit quality gate, tmux dev-server block) were deliberately left out; pull them from `ECC-Claude/scripts/hooks/` if wanted.

## Permissions
`settings.json` pre-allows pnpm/npx/node/uv/python/ruff/pytest, read-only and branch-level git, gh pr/issue, common file utilities, and WebFetch on the docs domains used here. Denied: reading `.env*`, force-push, `rm -rf /`, `sudo`. Add personal allowances to `.claude/settings.local.json`.

## Parallel development
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set in `settings.json` env, so the Agent tool accepts `name` and teammates can SendMessage each other.
- `/lanes` creates `.claude/worktrees/<lane>` on `lane/<lane>` branches with a `.lane` marker, launches one owner agent per lane, and merges through gates. Humans can join with `claude -w <lane>`.
- Subagents can also take `isolation: "worktree"` for one-off isolated tasks.
- `.worktreeinclude` copies `.env` files into new worktrees.

## Keeping docs current
`npx ctx7@latest docs /pmndrs/react-three-fiber "<topic>"`, `/pmndrs/drei`, and the `library` command for Tailwind/Vite/FastAPI. The `threejs-r3f/references/` snapshots are dated; refresh them when R3F or drei bumps a major.

## Updating from ECC
ECC is vendored at `ECC-Claude/` (gitignored). To pull a newer skill: copy `ECC-Claude/skills/<name>` into `.claude/skills/`, read it, and strip anything that assumes the `ecc@ecc` plugin (`/ecc:*` commands, `ecc:` agent prefixes). Do not install the full plugin on top of this setup; it adds 293 skills and 68 agents of context the project does not need.

## Memory
Claude keeps a per-project memory under `~/.claude/projects/-Users-jeevaparajuli-Desktop-Project-Active-Truehand/memory/` for facts that are not in the repo (deadlines, decisions, people). Repo facts belong in these docs, not in memory.
