# Truehand end-to-end specs

Playwright specs for the critical flows, written against the binding selector contract in
`docs/UI_CONTRACT.md` (roles and accessible names first, `data-testid` second). Page objects in
`pages/` hold every selector; specs never write a raw selector for contract UI.

## Running

```
cd apps/web
pnpm exec playwright install chromium webkit   # once
pnpm test:e2e                                  # default run (from the root: pnpm --filter web test:e2e)
PLUMBLINE_E2E_FULL=1 pnpm test:e2e             # full run, after the Sprint 1 lanes merge
pnpm exec playwright test e2e/worked-example.spec.ts --project=chromium
```

### The `PLUMBLINE_E2E_FULL` flag

The Sprint 1 UI lanes (web-shell, scene, landing, voice) built in parallel with these specs. A test
that needs UI not yet on the branch calls `needsFullUi('<lane>')` (`helpers/full.ts`), which marks
it `fixme` unless `PLUMBLINE_E2E_FULL=1`. So:

- **Default run**: everything that runs against the UI on the branch, and it must be green. Tests
  that need missing UI show up as skipped, with the lane they wait for in the reason.
- **Full run**: every test runs. Before integration the failures name the missing contract element
  (for example `waiting for getByTestId('instruction')`). After integration the full run is the
  gate, and the flag (and `needsFullUi`) should be removed once it is green.

Tests that run in the default run today: the fixture sanity check, the assertive live-region warning
(announced exactly once), the reading-log warning column, the skip link as the first Tab stop, the
landing mast and simulator link, and axe on `/`, `/evidence` and `/about` in all three themes.

## Server and determinism

- `webServer` runs `pnpm exec tsc -b && pnpm exec vite build --mode test && pnpm exec vite preview
--port 4173 --strictPort`: the production bundle Render publishes, built in `test` mode so the
  dev-and-test-only hooks exist (the fake recognition stub on `?fakeVoice=1`, which installs only
  when `import.meta.env.DEV || MODE === 'test'`, and `window.__plumblineScene`). It keeps the service
  worker (needed by the offline spec) and has no HMR timing noise. A plain `pnpm build` has no voice
  stub, so the voice spec skips itself under `PLUMBLINE_E2E_BASE_URL` (a deployed production site).
  `VITE_PREVIEW_GATE=0` is forced so a local `.env.local` cannot lock `/sim`.
- Every test aborts `**/v1/**` (`helpers/test.ts`), so no spec depends on an engine another lane may
  be running on :8000. Replay never needs it. `engineTraffic.requests` lists what the page tried.
- `PLUMBLINE_E2E_PORT` changes the port. `PLUMBLINE_E2E_REUSE=1` reuses a server already on it (off by
  default: in parallel worktrees, a preview on 4173 may be another lane's code).
  `PLUMBLINE_E2E_BASE_URL=https://...` runs against a deployed site and starts no server.
- Expected numbers come from the fixture the app replays (`helpers/fixture.ts`: the recorded
  `engine/fixtures/parity/<name>.json`, else `src/fixtures/provisional/<name>.json`), never from the
  brief.

## Projects

| Project                   | Specs                                      | Why                                              |
| ------------------------- | ------------------------------------------ | ------------------------------------------------ |
| `chromium`                | all                                        | main run, 1280x800, dpr 1                        |
| `chromium-reduced-motion` | worked-example, slip-warning, landing      | `reducedMotion: 'reduce'` (DESIGN_REFERENCES F8) |
| `webkit`                  | a11y, keyboard-only, worked-example, smoke | Safari engine for a11y and keyboard              |
| `record`                  | `record/video-v1.ts`                       | only when `PLUMBLINE_RECORD=1`; 1920x1080 video  |

Traces: `on-first-retry`. Retries: 1 in CI, 0 locally. Screenshots: on failure only.

## Specs

| Spec             | Asserts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `worked-example` | Told row 3; typed 3.671 V is accepted, the log shows told row 3, landed row 2, the warning names row 2; the published method in the belief figure shows the fixture's baseline top (R2 is shorted); typed 0.338 V resolves to "R3 is ten times too small", focused, confidence above 95% and within 1 point of the fixture; the same via "Next recorded reading"; landed row hidden until accepted; PROVISIONAL badge while the fixture is provisional; a reading the recording does not expect is refused |
| `slip-warning`   | The warning reaches `#live-assertive` (aria-live, no role) exactly once, naming told and likely rows; the banner (`data-testid="warning-banner"`) is the region "Placement warning", `tabindex=-1`, focused, starts with "Warning.", is not a live region, mounts once; no `role="alert"` anywhere for the event; only the slipped step is marked in the log. Also runs with reduced motion                                                                                                                |
| `keyboard-only`  | No pointer at all. Skip link is the first Tab stop; `?` opens the shortcut dialog and `Esc` closes it; `T`, typing, `Enter`, `]`, `[`, `R`, `P` drive the whole worked example; `1` to `9` and the placement buttons move the aimed row (`aria-current="true"`, "aimed") and submit nothing; shortcuts are ignored inside the input, with Alt held, and while the shortcut dialog is open; the "Single-key shortcuts" switch (on by default) turns them off while buttons keep working (WCAG 2.1.4)        |
| `voice`          | `?fakeVoice=1`: speech off by default and silent (synthesis is counted, not played); `V` turns it on and the warning is spoken; `M` then `say('three point six seven one')` submits 3.671 through the voice channel; a phrase said before the mic opens is held and submitted on the next listen; markup in a transcript is never rendered or run                                                                                                                                                          |
| `a11y`           | axe (WCAG 2.0 to 2.2 A and AA tags) on `/`, `/sim?demo=worked-example`, `/evidence`, `/about`, and `/sim` with the warning and then the diagnosis showing, in light, dark and hc (`<html data-theme>`): zero serious or critical                                                                                                                                                                                                                                                                           |
| `offline-replay` | With the API aborted, `/sim?demo=worked-example` completes, opens no engine session, and api-status says "waking up". Chromium only: after the service worker controls the page, the network goes off, the page reloads, and the replay still completes                                                                                                                                                                                                                                                    |
| `thermometer`    | `thermometer_demo` replay: SIMULATED badge visible at the start, after every step and at the end, and a MutationObserver sees no gap; the Thermometer radio is checked and the Celsius input is present                                                                                                                                                                                                                                                                                                    |
| `no-webgl`       | `getContext('webgl'/'webgl2')` returns null: no canvas, every text panel present, the replay completes; the landing reads fully. `view=text`: Text only on, no scene, the replay completes                                                                                                                                                                                                                                                                                                                 |
| `refusal`        | `unresolved_pair` replay (skipped until the fixture is recorded): steps to the end; the `unresolved` region ("Unresolved") says "will not guess" and names both labels from the fixture; no diagnosis; the belief verdict (`belief-verdict`) starts "Unresolved", names both, and has no percentage                                                                                                                                                                                                        |
| `landing`        | Mast H1 and simulator link; ten labelled sections with static, non-live captions; transcript in the DOM before Play; scrolling never starts the example; Play runs it to the end ("Pause", then "Replay"); reduced motion (OS setting or the switch) snaps to the final state                                                                                                                                                                                                                              |
| `smoke`          | Sprint 0 smoke (landing and a worked-example replay against the placeholder)                                                                                                                                                                                                                                                                                                                                                                                                                               |

## Known races and how the specs avoid them

- **Reveal race.** After a step with a landed site the store is `revealing` for up to
  `REVEAL_TIMEOUT_MS` (3 s) and ignores `]` and Next. `SimPage.waitForStep(n)` waits until row n's
  Landed cell is no longer "hidden" (or the session ended) before the next step.
- **Input focus.** The reading input takes focus in `awaiting_reading`, and the keyboard guard ignores
  shortcuts there. Keyboard specs blur or Tab out before a shortcut.
- **Voice stub.** `__plumblineFakeRecognition` is installed asynchronously; the voice spec waits for
  it, and for `aria-pressed="true"` on Listen, before `say()`.
- **Health probe.** The API is always aborted, so the probe ends in a known state (not ok).
- **Stale service worker.** `serviceWorkers: 'block'` for every test; only the offline-after-install
  test allows one, so a cached build never answers in place of the server under test.
- **Reveal leaks.** `helpers/landedLog.ts` records every value a Landed cell shows. With an animated
  reveal the sequence must be exactly `hidden`, then the landed row; with reduced motion or no scene
  the store finishes the reveal in the same update, so the landed row alone is also accepted.
- **Absence checks.** "Nothing happened" assertions follow a positive observable: the refusal
  sentence for an unexpected replay reading, or one key that must step exactly once after keys
  that must not.
- **Story values.** Readings, rows and labels come from the fixture (`helpers/story.ts`).

No spec uses a retry as a fix today.

## Recording the video (`record/video-v1.ts`)

Follows `docs/VIDEO_STORYBOARD.md` shot by shot. One context per shot with `recordVideo` at
1920x1080, dark theme, `?present=1&script=video-v1&shot=<n>`, key presses (`P`, `]`) with fixed
waits; the storyboard fallbacks (section 3) apply automatically when the `unresolved_pair` or
`thermometer_demo` fixtures are not recorded yet.

```
cd apps/web
PLUMBLINE_RECORD=1 pnpm exec playwright test --project=record
# against a deployed site:
PLUMBLINE_RECORD=1 PLUMBLINE_E2E_BASE_URL=<deployed web URL> pnpm exec playwright test --project=record
```

Output in `apps/web/recordings/video-v1/`: `shot-<n>.webm` and `shots.json`. The repo `.gitignore`
ignores `**/recordings/`, so nothing in that folder can be committed. Each WebM starts at
page load; `shots.json` gives `start` and `end` (seconds into that file) for the part that belongs to
the shot, plus the storyboard slot and notes (provisional fixture, dropped shots, no scene, no
presentation mode). Trim before the storyboard's concat step, for example:

```
cd apps/web/recordings/video-v1
for n in $(jq -r '.shots[].shot' shots.json); do
  s=$(jq -r ".shots[] | select(.shot==$n) | .start" shots.json)
  e=$(jq -r ".shots[] | select(.shot==$n) | .end" shots.json)
  ffmpeg -y -ss "$s" -to "$e" -i "shot-$n.webm" -c:v libvpx-vp9 -b:v 0 -crf 30 "trim-$n.webm"
done
```

then concatenate the `trim-<n>.webm` files with the commands in the storyboard, section 2.2.
