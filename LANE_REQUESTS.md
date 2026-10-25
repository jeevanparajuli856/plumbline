# Lane requests from `lane/voice`

Changes outside `apps/web/src/voice/**` that this lane needs. None were made here.

## 1. Playwright must build in test mode for `?fakeVoice=1` (owner: e2e / configs)

`stubs/fakeRecognition.ts` installs `window.__plumblineFakeRecognition` only when `?fakeVoice=1` is present AND
`import.meta.env.DEV || import.meta.env.MODE === 'test'`. `playwright.config.ts` serves a production build
(`pnpm build && pnpm preview`), so today the stub never installs in e2e. Change the webServer command to
`pnpm exec tsc -b && pnpm exec vite build --mode test && pnpm preview --port 4173 --strictPort`
(or add a dedicated `build:test` script). The production build is unaffected.

## 2. Coverage floor for voice (owner: integration / vitest.config.ts)

Add `'src/voice/**': { lines: 80, statements: 80 }` to `coverage.thresholds`. Measured on this branch:
96.68% lines, 94.52% statements.

## 3. One event-selection function for announcer and voice (owner: a11y)

`a11y/announcer.ts` and `voice/phrases.ts#createEventPhraser` pick the same `DOMAINS` phrases with the same
logic. Today `voice/phrases.test.ts` pins them by replaying the worked example through both and asserting
identical text and priority sequences. To remove the duplication, have `startAnnouncer` call
`createEventPhraser(useSession.getState())` and `announce()` each returned utterance (move the phraser
into `a11y/` if you prefer the dependency to point that way).

## 4. Integration wiring (owner: web-shell, at integration)

- `App.tsx`: `useEffect(() => startVoice(), [])` next to `startAnnouncer()`. The cleanup it returns stops
  recognition, cancels speech and removes the gesture-unlock listeners (StrictMode-safe).
- Key map: `M` -> `toggleListen()`, `Esc` -> `cancelListen()` (in addition to closing dialogs). Same
  editable-target and modifier guards as the other shortcuts.
- `/sim` header Listen button: `const { supported, listening, toggleListen } = useVoice()`;
  `<button aria-pressed={listening} aria-keyshortcuts="M" onClick={toggleListen}>`. Keep it enabled when
  `!supported`: pressing it says why and moves focus to the typed input.
- Optional status text: `useVoiceStatus()` returns `'parsing'` while the recognizer works and
  `'confirming'` while it waits for yes or no.

## 5. Listening cue for screen-reader-only users (owner: a11y, Sprint 2)

The "Listening." cue is speech-only, so it plays only when speech output is on and finishes before the mic
opens. A screen-reader user with speech off presses `M` and hears nothing unless focus is on the
`aria-pressed` button. Announcing the cue to the live region would let the screen reader talk into the open
mic. Proposal: a short earcon (Web Audio tone) on mic open/close, decided with the a11y auditor.
