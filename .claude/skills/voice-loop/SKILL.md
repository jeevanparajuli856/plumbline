---
name: voice-loop
description: Implement the Plumbline spoken interaction loop with the browser Web Speech API - speak instructions, listen for a spoken reading, confirm, handle recognition failure with typed fallback, mirror everything to the aria-live region, keep speech off by default, unlock audio on iOS, and keep the state machine testable behind an adapter so Capacitor can replace the browser later. Use when building or debugging apps/web/src/voice.
---

# Voice loop (Web Speech API)

The product channel for a blind user. The loop: speak instruction -> listen for reading -> parse -> confirm (only when alternatives disagree) -> send to engine -> speak result or warning -> repeat. Must be fully operable without the monitor and must degrade to typed input without losing session state.

## Defaults that are not negotiable
- **Speech output is OFF by default.** The aria-live regions are always on, so a screen-reader user hears everything through their own reader and is never doubled by TTS. `V` toggles speech on; the preference persists in `state/prefs.ts`.
- The typed input is always visible, even when voice is active. iOS Safari recognition is unreliable in a standalone PWA.
- Every spoken string also goes through `announce()`; the phrases are the same object.

## Browser facts (verify in MDN before relying on an edge case)
- `speechSynthesis.speak(new SpeechSynthesisUtterance(text))`; pick a voice once (`getVoices()` loads async; listen for `voiceschanged`). `speechSynthesis.cancel()` before an assertive message.
- **iOS gesture unlock:** Safari refuses `speak()` until a user gesture has occurred. `speak.ts` exposes `unlock()`, called on the first pointer or key event; it speaks an empty utterance and marks the engine ready. Until unlocked, utterances queue.
- **Chunking:** some engines truncate long utterances. Split every utterance into chunks under 200 characters at sentence or clause boundaries and chain them on `onend`.
- `SpeechRecognition` is `window.SpeechRecognition || window.webkitSpeechRecognition`. Chrome and Edge support it (server-based); Safari partial; Firefox no. Feature-detect and expose typed input.
- Use `continuous = false`, `interimResults = false`, `maxAlternatives = 3`, `lang = 'en-US'`. `abort()` on cleanup.
- Do not listen while speaking; start recognition on the last chunk's `onend`.
- Demo environment: Chrome, a quiet room, a USB mic. The recorded video is the fallback.

## Module layout
```
apps/web/src/voice/
  speak.ts              queue with priorities (warning > instruction > info); chunking < 200 chars; unlock(); repeat-last; mute; cancel before assertive
  listen.ts             adapter interface: start(opts) -> Promise<{alternatives: string[]}>, abort(), isSupported(); picks adapters/web or adapters/capacitor
  adapters/web.ts       SpeechRecognition implementation
  adapters/capacitor.ts stub for the finals iOS wrapper (same interface)
  parseReading.ts       "three point six seven one volts" | "3.671" | "point three three eight" | "sixty five point six degrees" -> number | null; unit-aware
  voiceMachine.ts       pure reducer emitting effects: states off | idle | speaking | listening | parsing | confirming | submitting
  useVoiceLoop.ts       React hook wiring machine + store + effects; cleans up on unmount
  phrases.ts            all spoken strings in one place; imported by a11y/announcer.ts so voice and aria-live say the same words
  stubs/fakeRecognition.ts  Playwright stub resolving scripted transcripts
  __tests__/            parseReading table tests, machine transition tests, hook test with mocked speak/listen
```

## Adapter interface (`listen.ts`)
```ts
export interface ListenAdapter {
  isSupported(): boolean
  start(opts: { lang: string; maxAlternatives: number; timeoutMs: number }): Promise<{ alternatives: string[] }>
  abort(): void
}
```
Web now, Capacitor later. The machine and the hook never touch `window.SpeechRecognition` directly, so the iOS lane swaps the adapter without touching the loop.

## Domain-aware units
`phrases.ts` and `parseReading.ts` take the domain's `unit` and `unitSpoken` from `DomainSpec`: volts for the circuit, degrees Celsius for the thermometer. Accept "volts", "V", "millivolts" (/1000), "degrees", "degrees Celsius", "C". Spoken readings use the domain's `readingDecimals`. Never hard-code "volts" in a phrase.

## Parsing readings
Handle: digits with decimal, spelled numbers ("three point six seven"), "negative"/"minus", unit words, common mis-hearings ("to" -> 2, "for" -> 4 when adjacent to numbers). Return `null` when ambiguous. Confirm ("I heard three point six seven one volts, is that right?") only when the alternatives disagree; otherwise accept and keep the loop fast. Table-driven, 30+ rows.

## Spoken phrasing (keep in `phrases.ts`, shared with `a11y/announcer.ts`)
- Instruction: "Touch row three. Say the reading when ready." (thermometer: "Insert the probe to five point five centimeters.")
- Accepted: "Three point six seven one volts."
- Warning: "That reading did not come from row three. It most likely came from row two. Please try row three again."
- Diagnosis: "R3 is about ten times too small. Confidence ninety-eight percent." (the number comes from the engine, never typed into the phrase)
- Unresolved: "I cannot separate two possibilities from readings alone. I will not guess."
- Simulated domain: every instruction in the thermometer domain is prefixed once per session with "This instrument is simulated."
- Commands recognized at any time: "repeat", "again", "undo", "type instead", "stop".

## Accessibility coupling
`announce(text, {priority, dedupeMs, force})` runs for every phrase whether speech is on or off; polite drains one per 700 ms, assertive clears polite. Keyboard: `M` starts listening (not Space, which scrolls and activates buttons), `V` toggles speech, `R` repeats the last phrase, `T` focuses the typed input, `Esc` stops listening. Shortcuts ignore editable targets and modifier combinations and are also buttons with `aria-keyshortcuts`.

## Testing
- `parseReading` table-driven tests across both units. `voiceMachine` reducer tests for every transition including recognition error, no-speech timeout, "type instead", speech off, and unlock pending.
- Playwright: install `stubs/fakeRecognition.ts` as `window.SpeechRecognition` with scripted transcripts; assert the LiveRegion text and store state. Record the blindfold replay run in Chrome once the loop is green.
