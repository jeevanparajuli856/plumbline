# UI contract for parallel Sprint 1 lanes

Status: v1, 2026-10-25, written on `main` before the Sprint 1 lanes launched. Owner: the integration step on `main`. Lanes build to this; changes go through `main`.

Why: `e2e` writes specs while `web-shell`, `scene`, `landing` and `voice` build the UI in parallel. Specs select by role and accessible name first, `data-testid` second. Every name below is a contract; the visible copy around it may change.

## 1. `/sim` (web-shell)

| Element           | Selector contract                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Page heading      | `h1` (focused on route change). Visible text is the current instruction while awaiting a reading, e.g. "Touch the red probe to row 3."  |
| Instruction       | `data-testid="instruction"`; contains the site label ("row 3")                                                                          |
| Reading input     | `getByLabel('Meter reading in volts')` (circuit) / `getByLabel('Thermometer reading in degrees Celsius')` (thermometer); `T` focuses it |
| Submit            | `getByRole('button', { name: 'Submit reading' })`; `Enter` in the input submits                                                         |
| Warning | `getByTestId('warning-banner')`: `role="region"`, accessible name "Placement warning", `tabIndex=-1`, receives focus when a warning arrives. NOT a live region: the announcer's assertive message is the only spoken copy. Visible text starts with "Warning." and names the likely row |
| Diagnosis         | `data-testid="diagnosis"`, `role="region"`, accessible name "Diagnosis"; receives focus on `resolved`                                   |
| Refusal           | `data-testid="unresolved"`, `role="region"`, accessible name "Unresolved"; contains "will not guess"                                    |
| Belief chart      | `role="figure"` name "Belief over faults"; a table twin `getByRole('table', { name: 'Belief over faults' })`                            |
| Published method  | row or bar labeled "Published method" in the belief figure                                                                              |
| Placement strip   | `getByRole('list', { name: 'Where the probe landed' })`, one `listitem` per site with a percentage in text                              |
| Reading log       | `getByRole('table', { name: 'Reading log' })`; columns Step, Told, Reading, Landed, Warning; Landed shows "hidden" until revealed       |
| Replay controls   | buttons "Next recorded reading", "Play", "Pause", "Previous step"; keys `P`, `[`, `]`                                                   |
| Reset             | button "Reset"                                                                                                                          |
| Mode switch       | `getByRole('radiogroup', { name: 'Mode' })` with radios "Simulate", "Live meter", "Replay"                                              |
| Instrument switch | `getByRole('radiogroup', { name: 'Instrument' })` with radios "Circuit", "Thermometer (simulated)"                                      |
| Speech toggle     | `getByRole('switch', { name: 'Speech' })`, off by default; `V` toggles                                                                  |
| Microphone        | `getByRole('button', { name: /Listen/ })` with `aria-pressed`; `M` toggles; hidden when speech recognition is unavailable               |
| Text only         | `getByRole('switch', { name: 'Text only' })`                                                                                            |
| Theme             | `getByRole('radiogroup', { name: 'Theme' })` radios "System", "Light", "Dark", "High contrast"; sets `<html data-theme>`                |
| Keyboard map      | `?` opens `getByRole('dialog', { name: 'Keyboard shortcuts' })`; `Esc` closes                                                           |
| API status        | `data-testid="api-status"`; when the API is not ok the text contains "waking up"                                                        |
| Badges            | text "PROVISIONAL", "SIMULATED", "PENDING" inside `data-testid="badge"`                                                                 |
| Skip links        | first focusable element: link "Skip to main content"                                                                                    |
| Presentation      | `?present=1` hides site header and footer (`data-present="true"` on `<html>`)                                                           |

Keyboard guard: no single-key shortcut fires when focus is in an input, textarea, select or contenteditable, or when Ctrl, Meta or Alt is held. `Enter` and `Esc` keep their native behavior inside inputs.

## 2. Landing `/` (landing)

| Element         | Selector contract                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| H1              | "Measurement you can trust without looking."                                                                            |
| Play            | `getByRole('button', { name: 'Play the 20-second example' })`; never autoplays                                          |
| Open simulator  | `getByRole('link', { name: 'Open the simulator' })` to `/sim`                                                           |
| Sections        | `<section aria-labelledby>` with ids `mast, research, problem, play, how, generalize, product, ladder, evidence, close` |
| Play transcript | `getByRole('list', { name: 'Worked example, step by step' })`, always in the DOM                                        |
| Captions        | `data-testid="caption"`, mono, not live regions                                                                         |
| Reduce motion | ONE app-wide `getByRole('switch', { name: 'Reduce motion' })` in the site Display bar (web-shell, `ui/PrefsBar.tsx`, state in `a11y/motionPref.ts`, mirrored to `<html data-reduce-motion="true">`). Landing does not render its own; it reads `prefersReducedMotion()` / `useReducedMotion()` from `@/a11y/useReducedMotion`, which returns the OS setting OR the switch after integration |

## 3. Scene (scene)

- Mounting: `SceneHost` (scene lane) renders the one Canvas. In `sceneMode === 'landing'` it is a fixed full-viewport layer behind the landing content (`pointer-events: none` except while a section asks for interaction). In `sceneMode === 'sim'` it portals into `document.getElementById('scene-slot')`, an empty element the web-shell `/sim` layout renders where the 3D panel goes; if the slot is absent (text-only view), nothing mounts.
- The scene calls `setSceneMounted(true)` from `@/state/session` on Canvas mount and `false` on unmount. Without it the store does not wait for a reveal animation; with it the store still finishes the reveal itself after `REVEAL_TIMEOUT_MS` (3000) if the scene never calls `finishReveal(token)`.
- Landing camera: `poseAt(progress)` and `ScenePose` from `@/landing/choreography` (signature frozen on `main`; landing owns the body, scene consumes the type).

- Canvas wrapper `data-testid="scene"`. In sim mode it carries `role="img"` with an `aria-label`. In landing mode the fixed layer is decorative and `aria-hidden="true"` (the landing captions are the content), so it adds no landmark and no axe `region` finding.
- `window.__plumblineScene` is set in dev and test builds only to `{ drawCalls: number, frames: number }`, updated after each rendered frame, so e2e and perf can read `renderer.info.render.calls` without a GPU profiler.
- No informational text is only in the scene.
- Without WebGL (or in text-only view) no `<canvas>` is created: `SceneHost` renders `SceneUnavailable` (or nothing) and three.js is never loaded.

## 4. Voice (voice)

- `apps/web/src/voice/index.ts` exports `useVoice(): { supported: boolean, listening: boolean, toggleListen(): void, speakingEnabled: boolean }` and `startVoice(): () => void` (subscribes to the store and the announcer text, speaks only when `usePrefs.voiceEnabled` is true).
- Recognition stub for Playwright: `window.__plumblineFakeRecognition = { say(transcript: string, alternatives?: string[]): void }`, installed when `?fakeVoice=1` is present (dev and test builds).
- The integration step wires `useVoice` into the `/sim` header and `M` key; until then web-shell renders the Listen button only when `useVoice` exists (it does not import voice/ during Sprint 1 lanes).

## 5. Engine (engine)

Recorded fixtures must parse with `Fixture` in `apps/web/src/engine/schemas.ts` (the web Zod mirror). In particular: `prior_instruction.gain_bits` and `steps[].engine_choice.gain_bits` are per-site arrays; `catalog.hypothesis_labels` is present; `diagnosis` is `{hypothesis_id, confidence}` or null; `landed_site` is an int or null; `placement_audit` is a list of per-site arrays.

## 6. Decisions added 2026-10-25 (from the e2e lane's contract gaps)

| # | Decision |
|---|---|
| 1 | Live regions: `#live-polite` and `#live-assertive` (from `a11y/LiveRegion.tsx`) are contract selectors. |
| 2 | Superseded 2026-10-25 by the web-shell review (M5): no element on `/sim` carries `role="alert"` for engine events. `#live-assertive` is `aria-live="assertive"` (no role), the banner is a focusable region (section 1 "Warning"). Specs select the banner by test id and the spoken copy via `#live-assertive`. Form validation may still use `role="alert"`. |
| 3 | Landing play controls inside `section#play`: buttons "Play the 20-second example", "Pause" and "Replay" (exact names). |
| 4 | Aiming: the placement-strip `listitem` for `aimedSite` carries `aria-current="true"` and the visible word "aimed". At integration the announcer also says "Aiming at row n." politely. |
| 5 | `/sim?view=text` turns the "Text only" switch on (no `#scene-slot`, no canvas). `view=scene` and `view=both` are the other values; `both` is the default. |
| 6 | `[` (Previous step) returns the replay to the state after the previous accepted reading (implemented as reset plus replay to `stepIndex - 1`, each reveal finished at once). After a diagnosis, `[` gives one accepted reading and no diagnosis. |
| 7 | Replay pacing stays at the store default of 1800 ms for `P` and landing Play; the storyboard uses 1800 ms. No `?pace` parameter in Sprint 1. |
| 8 | Scene readiness for recordings: `window.__plumblineScene.frames > 0` (section 3). There is no `scene-ready` test id. |
| 9 | Landing sections are addressed by id, never by index. |
| 10 | Refused replay reading: when a typed reading is not the next recorded one, the store sets error `not_next_in_replay`; `/sim` shows its sentence (from `state/session.ts`) and adds no log row. Specs wait for the sentence, then assert no new row. |
| 11 | Voice (section 4): a phrase said before the mic opens is held for the next listen; transcripts are data and are never rendered as markup. |
| 12 | Full e2e run: after the Sprint 1 integration, `PLUMBLINE_E2E_FULL` gating becomes opt-out (all specs run by default). |
| 13 | Aim buttons: each placement-strip item contains a button named "Aim at <site label>" (e.g. "Aim at row 4"; thermometer "Aim at 3.5 cm"), which calls `aimProbe`. Single-key shortcuts switch: `getByRole('switch', { name: 'Single-key shortcuts' })`, on by default, in the site Display bar or the shortcuts dialog. |
| 14 | Belief verdict: the one-line Plumbline verdict inside the belief figure is `data-testid="belief-verdict"`. Resolved or continuing: the top fault and its percentage. Unresolved: text starting "Unresolved" naming the class members, with no percentage. |
