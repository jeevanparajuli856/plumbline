# Truehand build plan

Status: v1, 2026-10-25. Replaces the v0 slices. Source: approved plan (sprints, lane matrix, verification, user actions). The State column is updated by doc-updater at each lane transition.

## Dates

| Milestone         | Date                                                                                               | Source             |
| ----------------- | -------------------------------------------------------------------------------------------------- | ------------------ |
| Nexus application | submit 2026-10-25, before 23:59 CT (user action 1). Submission status is not verified in this repo | plan, user actions |
| Semifinal review  | about Nov 1 to 8; no format published; email to Nexus pending                                      | plan, Context      |
| Finals            | Dec 14 to 16, Nexus HQ Baton Rouge; 10-minute demo plus 5-minute Q&A                               | plan, Context      |
| Days to finals    | 50, counted from 2026-10-25                                                                        | plan header        |

## State legend

| State   | Meaning                                                   |
| ------- | --------------------------------------------------------- |
| backlog | planned; dependencies not ready                           |
| ready   | acceptance written; can start now                         |
| running | an agent or session is working in it now                  |
| review  | diff exists; `/verify` and `code-reviewer` pending        |
| blocked | cannot proceed; next action is in "Blocked / next action" |
| merged  | on `main`; `/verify` green                                |

Owner column: agent roles from `.claude/rules/agents.md`, or `user`. Sprints 2 to 5 owners are suggestions; the planner confirms them at sprint start.

## Sprint 0 - Foundations (Oct 25-26, serial, on main)

| Item                       | Owner                     | Acceptance                                                                                                                                                                                                                                                                                                                                                                                                                                              | Verify                                                              | State                                                                     |
| -------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1. Docs and skills         | this session, doc-updater | ADRs 0001-0011 (MADR) in `docs/decisions/`; `ARCHITECTURE.md` v1; `API_CONTRACT.md`; this file v1; `PITCH.md` (criteria map, 30-second explanation, judge Q&A, numbers policy); `VIDEO_STORYBOARD.md`; `EVIDENCE.md` (done vs pending). Skills: `truehand-engine` (API v1), `threejs-r3f` (plus rule), `voice-loop`, `bootstrap` (deps, uv flat layout, config-hook env), `demo-worked-example`, `verify` (paths); agents `e2e-runner`, `a11y-auditor` | markdown review; no em-dashes; every number cites a file or command | merged                                                                    |
| 2. `/bootstrap` with fixes | this session              | `TRUEHAND_ALLOW_CONFIG_EDIT=1` for the scaffold; flat `engine/truehand` and `engine/truehand_api` with hatch build config; add react-router, vite-plugin-pwa, motion, fontsource fonts, eslint-plugin-jsx-a11y, size-limit; lockfiles committed so `--frozen-lockfile` works                                                                                                                                                                         | `pnpm verify`; `uv run --project engine pytest`                     | merged                                                                    |
| 3. Freeze shared contracts | this session              | `apps/web/src/state/types.ts`, `engine/client.ts` with `ReplayClient`, `state/landing.ts`, `styles/tokens.css`, `a11y/liveRegion.ts` stub, `render.yaml`. Commit `chore: bootstrap`                                                                                                                                                                                                                                                                     | `/verify` green on main                                             | merged                                                                    |
| 4. Launch Sprint 1 lanes   | this session              | `/lanes sprint-1` opens one worktree per lane                                                                                                                                                                                                                                                                                                                                                                                                           | worktrees listed                                                    | merged (six worktrees, 2026-10-25; seams pinned in `docs/UI_CONTRACT.md`) |

Sprint 0 merge gate: `/verify` PASS table on `main`; commit `chore: bootstrap`.

### Sprint 1 integration result (2026-10-25)

All six lanes merged on `main` (engine 2af54a7, web-shell 224f38e, scene 7735c9f, voice ea2569c, landing 924fd05, e2e 389be11), plus the docs catch-up (b2c3148) and the accessibility audit fixes. `pnpm verify` exit 0: 651 web tests, 190 pytest; coverage floors engine 90, state, voice and a11y 80. Full Playwright run: 95 passed, 0 failed, 3 skipped by design. Worked example over the API matches the fixture. Scene: 25 to 27 draw calls, 0 frames when idle (`docs/results/perf_2026-10-25.md`). Accessibility: 10 of 10 automated checks pass (`docs/results/a11y_2026-10-25.md`); VoiceOver pass PENDING. Video v1 recorded locally (`apps/web/recordings/video-v1/plumbline-video-v1.mp4`, 1920x1080, 164.8 s, gitignored), awaiting the user's review. Deployed on Render the same day (web https://plumbline-web-lxxc.onrender.com, API https://plumbline-api.onrender.com); direct links wait on the dashboard rewrite (Blocked 5), and the `v0.1-semifinal` tag follows it.

### Sprint 0 result (2026-10-25)

Docs, ADRs, contracts, scaffold and `render.yaml` are on `main`; `pnpm verify` green (web typecheck, lint, 8 vitest; Python ruff, 4 pytest). Sprint 1 is executed from `docs/HANDOFF_SPRINT1.md` by a coding session with parallel lanes.

## Sprint 1 - Oct 26 to Nov 1: working simulation deployed, video recorded

| Lane              | Owner                        | Write surface                                                          | Acceptance                                                                                                                                                                                                                                                                            | Verify                                                                                                                                                                                                                          | State                                                                                                                                                                                                                                                                |
| ----------------- | ---------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `engine`          | engine-scientist (tdd)       | `engine/**`                                                            | D1 circuit and catalog tests (six voltages within 1e-3 V); D2 engine core at least 90% coverage; D3 EIG, baselines, session; D4 nine fixtures and worked-example test; D5 API v1 with httpx tests and CORS; D6 thermometer and domains endpoint; D7 experiments write `docs/results/` | `uv run --project engine pytest -q --cov=truehand` (90% on `engine.py`, `domains/circuit.py`); `test_worked_example.py` and `test_fixtures.py` green; `uv run --project engine python -m truehand.experiments.experiment 400` | merged (2026-10-25, merge 2af54a7): 190 pytest passed; coverage `engine.py` 100%, `domains/circuit.py` 99%; nine fixtures recorded at d4731fc (`engine/fixtures/parity/`); simulated experiment, mismatch, sweep and stability results in `docs/results/` at d4731fc |
| `web-shell`       | ui-designer + tdd-guide      | `apps/web/src/{ui,a11y,sim,evidence,about}/**`, `App.tsx`, `styles/**` | sim panels, text channel, keyboard map, focus, three themes, evidence table, API status, presentation mode; keyboard-only flow works; axe clean in three themes                                                                                                                       | `/verify`; vitest state and a11y tests; Playwright axe in dark, light, hc                                                                                                                                                       | merged (2026-10-25, merge 224f38e; reviewed twice; keyboard gate 18/18; axe 0 serious or critical in three themes)                                                                                                                                                   |
| `scene`           | three-engineer               | `apps/web/src/scene/**`                                                | breadboard, probe, reveal, overlay, plumb line, roast scene, camera rig; under 150 draw calls (target about 27, measured); demand frameloop idles; reduced motion snaps; smoke tests                                                                                                  | vitest with `@react-three/test-renderer` smoke; measured `renderer.info.render.calls` recorded in PR; `/verify`                                                                                                                 | merged (2026-10-25, merge 7735c9f; 25 to 27 draw calls circuit, 9 roast, measured in the lane; 0 fps idle; strokes at least 4.28:1 in every theme)                                                                                                                   |
| `landing`         | ui-designer + three-engineer | `apps/web/src/landing/**`, `public/transcripts/**`                     | eight sections; pure `poseAt` with tests; captions; Play wired to replay                                                                                                                                                                                                              | vitest on `poseAt` keyframes; Playwright landing spec; reduced-motion snap test                                                                                                                                                 | merged (2026-10-25, merge 924fd05; reviewed twice; 348 lane tests)                                                                                                                                                                                                   |
| `voice`           | tdd-guide + a11y-auditor     | `apps/web/src/voice/**`                                                | voiceMachine, parseReading (30 or more rows), speak and listen, phrases shared with announcer, Playwright fake recognition stub                                                                                                                                                       | vitest on voiceMachine and parseReading; Playwright stub spec; blindfold replay run in Chrome                                                                                                                                   | merged (2026-10-25, merge ea2569c, ahead of landing because the surfaces are independent; wired in ed93332; 65-row parseReading; parity with the announcer pinned)                                                                                                   |
| `e2e`             | e2e-runner                   | `apps/web/e2e/**`, `playwright.config.ts`                              | worked-example, slip-warning, keyboard-only, a11y, offline-replay, no-webgl specs; `record/video-v1.ts`                                                                                                                                                                               | `pnpm test:e2e`; `video-v1.ts` produces WebM                                                                                                                                                                                    | merged (2026-10-25, merge 389be11 plus lint fix 51c0e94; full run on main 95 passed, 0 failed, 3 skipped by design)                                                                                                                                                  |
| Day 6 integration | this session, on main        | shared files                                                           | merge order engine, shell, scene, landing, voice, e2e; swap provisional fixture; a11y-auditor and code-reviewer passes; deploy to Render (load Render plugin in a fresh session); rehearse script                                                                                     | `/verify` PASS on main; `curl` `/v1/health` returns 200; Render URL `/sim?demo=worked-example` completes replay with the API asleep                                                                                             | integrated on main 2026-10-25; deploy blocked on Render access (Blocked 5)                                                                                                                                                                                           |
| Day 7             | user + e2e-runner            | none                                                                   | record video (Playwright run plus user voiceover); tag `v0.1-semifinal`; user emails Nexus about the semifinal format                                                                                                                                                                 | video file exists; tag exists                                                                                                                                                                                                   | backlog                                                                                                                                                                                                                                                              |

Sprint 1 merge gate, per lane: `/verify` PASS table in the worktree; `code-reviewer` on `git diff main...HEAD`. Integration gate: `/demo-worked-example` against the API and against `http://localhost:5173/sim?demo=worked-example`; keyboard-only run; screen-reader run planned for Sprint 2.

## Sprint 2 - Oct 26 to Nov 8: robustness, explainer, Lighthouse, release, video v2

Executed from `docs/HANDOFF_SPRINT2.md` by a coding session with parallel lanes. Verified on 2026-10-25 before kickoff: 656 web tests, 190 pytest, Playwright 95 passed / 3 skipped, live API replays the worked example, static site deep links 404 (rewrite missing).

| Lane | Owner | Write surface | Acceptance | State |
| --- | --- | --- | --- | --- |
| `engine-robustness` | engine-scientist | `engine/**`, `docs/results/**` | contact-state placement model (single row, bridge, no contact); mismatch bridging and poor-contact rows improve with before/after numbers; stability incl. thermometer; figures regenerated | ready |
| `explainer` | engine-scientist + tdd-guide | `engine/truehand_api/explain/**`, `routers/explain.py`, tests, API_CONTRACT section | ADR-0012: `POST /v1/sessions/{id}/explain`, Vertex AI Gemini and Anthropic providers, flag off by default, numeric-leak guard, fake-provider tests, rate limit | ready |
| `web-evidence-and-ask` | ui-designer + a11y-auditor + tdd-guide | `apps/web/src/{ui,sim,evidence,about,landing}/**`, `public/transcripts/**` | figures on `/evidence` with alt and source; transcript loader with provenance; Ask panel flag-gated with the mandatory label; Lighthouse a11y 100, perf 90+, best practices 95+ in three themes; VoiceOver checklist | ready |
| `security` | security-reviewer | `guard/errors/settings` when needed, `docs/results/security_<date>.md`, `render.yaml` headers | API review incl. explain prompt surface; `pnpm audit`, `pip-audit`; CSP and security headers; findings with fix status | ready |
| `release` | lead on main | shared files, Render | deep links 200 (rewrite rule or Blueprint); merges A, B, D, C with `/verify` and review; `TRUEHAND_EXPLAIN_PROVIDER` set only with user-supplied credentials; tag `v0.2-sprint2` | ready |
| `video-v2` | e2e-runner + user | `apps/web/e2e/record/**`, recordings (gitignored), storyboard | founder voiceover aligned to `shots.json`, ffmpeg mix, SRT, upload checklist | ready (waits on the user's takes) |
| `ts-port` (stretch) | engine-scientist + tdd-guide | `apps/web/src/engine/local/**` | parity below 1e-6 on nine fixtures; `LocalClient` behind `chooseClient` | backlog |

Done before kickoff (moved from the original Sprint 2 list): experiments with stability and sweep, mismatch stress tests, thermometer landing section (Generalize) and video shot 7, video v1 recorded.

User-owned: voiceover takes, ChatGPT transcript (protocol in PITCH.md), Nexus and Louisiana Center emails, VoiceOver human pass, Google Cloud project and service-account secret for the explainer, pitch Q&A review.

Sprint 2 merge gate: `/verify` PASS on main; mismatch before/after in `docs/results/`; Lighthouse accessibility 100; deep links 200; tag exists.

## Sprint 3 - Nov 9 to 22: self-sufficiency and the real world

| Item                                                           | Owner                        | Acceptance                                                                               | State   |
| -------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------- | ------- |
| TS port `engine/local/`                                        | engine-scientist + tdd-guide | parity below 1e-6 on all nine fixtures; `LocalClient` drives replay and simulate offline | backlog |
| PWA offline                                                    | e2e-runner                   | offline-replay spec green on the built app                                               | backlog |
| Hardware                                                       | user                         | breadboard built per the netlist; meter; first real blindfold run on camera              | backlog |
| `legacy/` adapter and `test_legacy_parity.py`                  | engine-scientist             | runs when Pankaj's code arrives                                                          | blocked |
| Confusion-matrix protocol sheet for Ruston (8 x 20 placements) | doc-updater + user           | sheet in `docs/`                                                                         | backlog |
| Letter-of-support ask                                          | user                         | ask sent                                                                                 | backlog |

Sprint 3 merge gate: parity below 1e-6 on all nine fixtures; offline-replay spec green.

## Sprint 4 - Nov 23 to Dec 6: measured numbers and iOS

| Item                                                                                                                              | Owner               | Acceptance                                               | State   |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------- | ------- |
| Measured confusion matrix into `Config.confusion.matrix`                                                                          | engine-scientist    | matrix recorded with source in `docs/results/`           | backlog |
| Re-run all experiments ("assumed 0.78" becomes "measured in Ruston")                                                              | engine-scientist    | new results files; old labels updated                    | backlog |
| Capacitor `apps/ios`, 7-day plan: init, speech adapter, VoiceOver pass, TestFlight, blind tester session, fixes, native recording | user + a11y-auditor | each day's item done or marked pending                   | backlog |
| Pitch deck; prize-use slide                                                                                                       | user                | deck exists; prize use cites the measured matrix and iOS | backlog |

Sprint 4 merge gate: all experiments re-run on the measured matrix; the numbers in the UI match `docs/results/`.

## Sprint 5 - Dec 7 to 13: freeze and rehearsal

| Item                                                     | Owner             | Acceptance                                 | State   |
| -------------------------------------------------------- | ----------------- | ------------------------------------------ | ------- |
| Render Starter plan on                                   | user              | plan shown as Starter in Render            | backlog |
| Fallback video                                           | e2e-runner        | video recorded and linked from `/evidence` | backlog |
| `pnpm audit` and `uv pip audit`                          | security-reviewer | output saved; findings fixed or noted      | backlog |
| Two full 10-minute rehearsals with the 5-minute Q&A list | user              | two rehearsals logged                      | backlog |
| Demo laptop offline run                                  | user + e2e-runner | replay runs with no network                | backlog |

Finals: Dec 14 to 16.

## Always true

- `main` is demoable. `/verify` is green before any merge. Conventional commits. Never `--no-verify`.
- Every number shown or written traces to a command run in this repo, a file, or a DOI. Simulated values say "simulated".
- Blind-user validation is PENDING until it happens. Build status and validation status are shown separately.
- Replay never needs the network. The worked example replays from its fixture.
- Indistinguishable faults are reported as unresolved, never forced to one answer.
- One lane is one worktree and one write surface. Shared files change on `main` or in the integration lane.
- A lane blocked for more than a day gets its next action written in the Blocked section.

## Blocked / next action

| #   | Item                                                                                                                 | Owner | Next action                                                                                                                                                                        | State   |
| --- | -------------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | `handsight` code (Pankaj's `circuit.py`, `engine.py`, experiments) is not on this machine                            | user  | ask Pankaj for the folder; it goes to `engine/truehand/legacy/`. Unblocks `handsight-import` and Sprint 3 `legacy/`                                                               | blocked |
| 2   | Louisiana Center for the Blind session                                                                               | user  | write to the Executive Director to book the afternoon session                                                                                                                      | blocked |
| 3   | Nexus semifinal review format, and whether post-submission updates may be shown                                      | user  | email natisha@nexusla.org with both questions                                                                                                                                      | blocked |
| 5   | Render deploy: the Render tools answer "unauthorized", and Render builds from GitHub, so `main` must be pushed first | user  | log the Render plugin in (or set a Render API key) and approve pushing `main` to `origin`; then the lead creates the services from `render.yaml` and sets `TRUEHAND_CORS_ORIGINS` | blocked |
| 4   | Render plugin installed but not loaded in this session                                                               | user  | restart Claude Code once after Sprint 0 so the Render plugin loads for the day-6 deploy. The `render` CLI is optional (`brew install render`)                                      | blocked |

## Engine-lane requests from the web lanes

These were requested by the web lanes. Each one is already in the v1 contract, so the engine lane builds it as specified.

| Request                                                          | Where it is specified                                           | State          |
| ---------------------------------------------------------------- | --------------------------------------------------------------- | -------------- |
| `domain` parameter on session creation and on the catalog route  | `docs/API_CONTRACT.md` sections 2 and 3.1                       | in v1 contract |
| Unresolved classes and reason in responses                       | `docs/API_CONTRACT.md` section 3.7 (`UnresolvedView`)           | in v1 contract |
| Fixtures `worked_example`, `unresolved_pair`, `thermometer_demo` | `docs/API_CONTRACT.md` section 8; Sprint 1 engine acceptance D4 | in v1 contract |
| CORS origin for the Vite dev server and the Render static site   | `docs/API_CONTRACT.md` section 6                                | in v1 contract |

Additional lane `explainer` (engine-scientist + tdd-guide, feature-flagged, ADR-0012): `POST /v1/sessions/{id}/explain` with a provider adapter (Vertex AI or Anthropic API, `TRUEHAND_EXPLAIN_PROVIDER=off` by default), context built only from session state, numeric-leak validation with fallback to engine phrases, "Ask" field and spoken "explain" command, on-screen label "Explanation by a language model. Numbers come from the engine." Not on the demo critical path.
