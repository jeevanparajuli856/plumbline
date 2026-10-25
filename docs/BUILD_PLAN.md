# Plumbline build plan

Dates: application due 2026-10-25 23:59 CT; semifinalist notice ~1 week later; finals 2026-12-14..16 (10-minute demo + 5-minute Q&A). Thin vertical slices, each demoable. States: backlog / ready / running / review / blocked / merged.

## Slice 0 - Foundations (now)
| Lane | Owner | Acceptance | Verify | State |
|---|---|---|---|---|
| claude-setup | (this session) | `.claude/` rules, agents, skills, hooks, docs in place; git + remote | hooks smoke test | review |
| bootstrap | `/bootstrap` | web app renders placeholder Canvas; API `/health`; `pnpm verify` green | `/verify` | ready |
| handsight-import | engine-scientist | teammate's files under `engine/plumbline/`; import smoke test; `experiment.py 400` runs | pytest | blocked: code not on this machine (get from Pankaj) |

## Slice 1 - Worked example end to end (API + minimal UI)
| Lane | Owner | Acceptance | Verify | State |
|---|---|---|---|---|
| engine-core | engine-scientist | `Session` state machine; replay + simulate modes; placement posterior + warning; baseline arm; `record_fixtures.py` writes worked_example + 5 seeds + slip_heavy | pytest, reference voltages to 1e-3 | backlog |
| engine-api | engine-scientist | endpoints per contract; Pydantic validation; CORS; httpx tests | pytest | backlog |
| web-shell | ui-designer + tdd-guide | tokens, layout, instruction panel, reading input (typed), warning banner, belief chart, reading log, LiveRegion | vitest, axe | backlog |
| e2e | e2e-runner | `worked-example.spec.ts` passes against replay mode | playwright | backlog |
Merge gate: `/demo-worked-example --api-only` PASS; keyboard-only flow works; a11y-auditor checklist clean.

## Slice 2 - 3D breadboard and noisy probe
| Lane | Owner | Acceptance | State |
|---|---|---|---|
| scene-board | three-engineer | board, instanced holes, rows 1-6 labeled, LED/resistors/battery/wires from `layout.ts`; < 150 draw calls; demand rendering idles | backlog |
| scene-probe | three-engineer | probe aims by click/keys/voice action; travels with spring easing; lands on revealed row; tremor idle; reduced-motion snap | backlog |
| scene-overlay | three-engineer | placement posterior glow per row; plumb-line pendulum settles with entropy; DOM twins announced | backlog |
Merge gate: smoke tests pass; perf numbers reported; screenshots in PR; a11y pass.

## Slice 3 - Live belief visualization and side-by-side baseline
| Lane | Owner | Acceptance | State |
|---|---|---|---|
| belief-viz | ui-designer | fault posterior chart (dataviz rules), top-k with unresolved pairs shown as a bracket; animates on update | backlog |
| side-by-side | ui-designer + engine-scientist | split view Plumbline vs published method on identical readings; the 20-second worked example as a scripted "Play" | backlog |
| stress-tests | engine-scientist | hand-model mismatch sweeps (lopsided slips, 3-row jumps, bridging); table in `docs/results/` with commands | backlog |

## Slice 4 - Voice loop
| Lane | Owner | Acceptance | State |
|---|---|---|---|
| voice | tdd-guide + a11y-auditor | speak/listen/parse/machine; "repeat", "type instead"; blindfold run possible end to end in Chrome | backlog |
| e2e-voice | e2e-runner | stubbed recognition spec; keyboard-only spec | backlog |

## Slice 5 - TS port and self-contained deploy
| Lane | Owner | Acceptance | State |
|---|---|---|---|
| ts-port | engine-scientist / tdd-guide | parity on all fixtures < 1e-6; UI switch `engine=local` | backlog |
| deploy | planner | static build on Vercel/Pages with replay + local engine; fallback video linked | backlog |

## Slice 6 - Demo polish and evidence (before finals)
Recordings (blindfold run, deliberate slip, screen-recorded experiment), prototype photos, Louisiana Center for the Blind confusion-matrix data (8 x 20 placements), re-run experiments with measured numbers, letter of support, pitch deck slide with the scale ladder.

## Always true
- `main` demoable; `/verify` green before merge; numbers traceable.
- If a lane blocks for more than a day, note the owner of the next action here.
