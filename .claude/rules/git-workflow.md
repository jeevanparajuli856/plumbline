# Git workflow

## Branches
- `main` is always demoable. Protected by convention: merge via PR, never force-push.
- Lane branches: `lane/<name>` (e.g. `lane/engine-api`, `lane/scene-breadboard`). One lane = one worktree = one write surface.
- Worktrees live outside the repo tree or under `.claude/worktrees/` (gitignored). `claude -w <name>` creates `worktree-<name>`; rename is unnecessary.

## Commits
Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`, `ci:`.
Scope when useful: `feat(scene): noisy-hand probe landing animation`.
Atomic commits; each one passes `pnpm verify` where applicable. Never `--no-verify` (hook blocks it).

## Pull requests
1. `git diff main...HEAD` and read the whole diff.
2. `/verify` must be green; paste its table in the PR body.
3. Body: what, why, how tested, screenshots or recording for UI, parity numbers for engine changes.
4. End the PR body with the attribution line Claude Code provides.
5. Merge gate for lanes is in `docs/BUILD_PLAN.md`.

## Never commit
`.env*`, recordings over 20 MB, `node_modules`, `.venv`, Playwright traces, `.claude/settings.local.json`, `.claude/worktrees/`.
