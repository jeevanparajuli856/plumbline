---
name: lanes
description: Run Plumbline work as parallel lanes - pick the current slice from docs/BUILD_PLAN.md, confirm disjoint write surfaces, create one git worktree per lane, launch an agent per lane (worktree-isolated subagents or agent-team teammates), track state, and merge through gates. Use when more than one independent piece of work is ready.
disable-model-invocation: true
argument-hint: "[slice number | lane names] [--teams]"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent
---

# /lanes

Parallel development without collisions. Backed by skills `parallel-execution-optimizer` and `team-agent-orchestration`, and rule `.claude/rules/agents.md`.

## 1. Shape the lanes
Read `docs/BUILD_PLAN.md`. If the requested slice has no lane matrix yet, call the `planner` agent to produce one. Each lane needs: name, owner agent, write surface, acceptance criteria, verify command. Reject any two lanes whose write surfaces overlap; split or sequence them.

## 2. Create isolation
Preferred: one worktree per lane.
```
git worktree add .claude/worktrees/<lane> -b lane/<lane> main
echo "<lane>" > .claude/worktrees/<lane>/.lane
```
(`.claude/worktrees/` is gitignored; `.lane` is read by the session-start hook and status line.)
For dependencies that need `node_modules`, run `pnpm install` inside the worktree once (pnpm's store makes it cheap). For the engine, `uv sync --project engine` inside the worktree.

## 3. Launch
Option A, subagents in this session (default): for each lane, `Agent` with `subagent_type` = the owner agent, `isolation: "worktree"` is NOT used here because we created the worktree ourselves; instead pass the worktree path and instruct the agent to `cd` there and stay inside its write surface. Send all launches in one message so they run concurrently. Include in every prompt: the lane card, the relevant rules/skills names, the verify command, and "final message is the deliverable; include the commands you ran and their last lines".
Option B, `--teams`: with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` (already in `.claude/settings.json`), spawn named teammates with the Agent tool's `name` parameter, one per lane, and coordinate with SendMessage. Use for long lanes where teammates must talk (e.g. engine API shape vs. web client).
Option C, humans: tell the user `claude -w <lane>` opens a session in a fresh worktree for a teammate.

## 4. Track
Maintain the lane table in `docs/BUILD_PLAN.md` with states backlog / ready / running / review / blocked / merged and the evidence column (test output, screenshot, parity numbers).

## 5. Merge gates
For each lane in dependency order: `cd` into the worktree, `/verify`, `code-reviewer` on `git diff main...HEAD`, then `git checkout main && git merge --no-ff lane/<lane>` (or open a PR with `gh pr create` if the user wants review), re-run `/verify` on main, update the table, remove the worktree (`git worktree remove`). Never merge a lane whose verify table has a FAIL.

## 6. Report
Lane table with final states, merged commits, anything blocked and who owns the next action.
