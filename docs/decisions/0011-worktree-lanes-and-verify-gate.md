# ADR-0011: Worktree lanes with disjoint write surfaces; `/verify` gate; conventional commits

Status: accepted, 2026-10-25

## Context

The plan runs with one human and up to six agent lanes. Sprint 1 has six lanes (engine, web-shell,
scene, landing, voice, e2e) that must land in about six days. Two lanes that edit the same file
produce merge conflicts, and two agents that edit the same store type produce contract drift. The
rules already define the mechanism: `.claude/rules/git-workflow.md` names the lane branch
`lane/<name>`, one worktree per lane, and gitignored `.claude/worktrees/`. `agents.md` says write
surfaces must not overlap. `CLAUDE.md` says every lane passes `/verify` before merge.

The gate is not yet complete. The root `package.json` `verify` script runs `pnpm typecheck`,
`pnpm lint`, `pnpm test`, and `uv run --project engine pytest -q`. The `/verify` command described
in `CLAUDE.md` also covers parity, the build budget, and a secrets check. Those three checks are
not in the script as of this session. This ADR records the gap rather than claiming the gate is
complete.

## Decision

- `main` is always demoable. Changes reach it through a pull request. Force-pushing to main is
  blocked by a hook.
- Each lane is `lane/<name>` in its own worktree, created with `claude -w <name>` (which creates
  `worktree-<name>` per `git-workflow.md`). A lane owns one write surface. Sprint 1 surfaces are:
  `engine/**` (engine lane), `src/{ui,a11y,sim,evidence,about}/**` with `App.tsx` and `styles/**`
  (web-shell), `src/scene/**` (scene), `src/landing/**` and `public/transcripts/**` (landing),
  `src/voice/**` (voice), and `apps/web/e2e/**` with `playwright.config.ts` (e2e).
- Shared files (`package.json`, the Vite config, `tokens.css`, and the store types in
  `state/types.ts`) change only on `main` or in the named integration lane.
- Merge order for Sprint 1 is engine, then web-shell, scene, landing, voice, and e2e. The integration
  day runs on `main`, with the provisional fixture swap (ADR-0006).
- Merge gate for each lane: `/verify` PASS table pasted into the PR body, `code-reviewer` on
  `git diff main...HEAD`, and an `a11y-auditor` pass for any UI lane.
- Conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`, `ci:`).
  Each commit passes `pnpm verify` where applicable. Commits never use `--no-verify`, which a hook
  blocks.
- Agent teams (experimental, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) are an option for `/lanes`.
  The lanes do not depend on them.

## Consequences

Positive:

- Parallel work without shared-file races. A lane that stays in its surface cannot break another
  lane's tests by editing them.
- The merge order is written down, so the integration day has a plan.
- Commit history stays readable and each commit is a checkpoint that passes the gate.

Negative:

- The gate is weaker than the one described in `CLAUDE.md` until parity, budget, and secrets are
  added to `pnpm verify`.
- Shared files become a bottleneck. Changes to `state/types.ts` wait for integration.
- Overlap discipline depends on the agents. A lane that edits outside its surface needs to say so,
  as `00-plumbline.md` requires, and the review must catch it.

What to re-visit:

- Add parity, the build budget, and the secrets check to `pnpm verify`, or narrow the description
  of `/verify` in `CLAUDE.md` to what runs. This is a `docs/BUILD_PLAN.md` item.
- After Sprint 1, review whether any lane crossed its write surface and whether the merge order
  held. Adjust the lane table for Sprint 2.
- If the worktree naming in `git-workflow.md` (`worktree-<name>`) and the lane branch naming
  (`lane/<name>`) confuse the lanes, pick one convention and update the rule.

## Alternatives considered

- **One branch, serial work.** Rejected: one human with six lanes in about six days cannot finish the
  Sprint 1 scope serially.
- **Trunk-based work with no lanes.** Rejected: the shared files (store types, tokens, package
  scripts) would see overlapping edits from every agent.
- **Stacked pull requests.** Not evaluated in this ADR. They add review steps that the one-human
  schedule does not have room for.
- **Agent teams as the only coordination mechanism.** Kept as an option. The lane rules do not rely
  on an experimental flag.
