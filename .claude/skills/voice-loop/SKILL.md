---
name: voice-loop
description: Implement the Plumbline spoken interaction loop with the browser Web Speech API - speak instructions, listen for a spoken multimeter reading, confirm, handle recognition failure with typed fallback, mirror everything to the aria-live region, and keep the state machine testable. Use when building or debugging apps/web/src/voice.
---

# Voice loop (Web Speech API)

The product channel for a blind user. The loop: speak instruction -> listen for reading -> parse -> confirm (optional) -> send to engine -> speak result/warning -> repeat. Must be fully operable without the monitor and must degrade to typed input.

## Browser facts (verify in MDN before relying on an edge case)
- `speechSynthesis.speak(new SpeechSynthesisUtterance(text))`; pick a voice once (`getVoices()` loads async; listen for `voiceschanged`). Cancel before speaking a new high-priority message (`speechSynthesis.cancel()`).
- `SpeechRecognition` is `window.SpeechRecognition || window.webkitSpeechRecognition`. Chrome and Edge support it (server-based); Safari partial; Firefox no. Always feature-detect and expose typed input.
- Use `continuous = false`, `interimResults = false`, `maxAlternatives = 3`, `lang = 'en-US'`. Call `recognition.abort()` on cleanup.
- Do not listen while speaking; start recognition on `utterance.onend`.
- Demo environment: Chrome, a quiet room, a USB mic. Record a fallback video.

## Module layout
```
apps/web/src/voice/
  speak.ts            queue with priorities (warning > instruction > info); repeat-last; mute
  listen.ts           thin wrapper over SpeechRecognition returning Promise<{alternatives: string[]}>
  parseReading.ts     "three point six seven one volts" | "3.671" | "point three three eight" -> number | null
  voiceMachine.ts     pure reducer: idle -> speaking -> listening -> confirming -> submitting -> speaking ...
  useVoiceLoop.ts     React hook wiring machine + store + engine client; cleans up on unmount
  phrases.ts          all spoken strings in one place (also used by the LiveRegion)
  __tests__/          parseReading and machine tests (pure), hook test with mocked speak/listen
```

## Parsing readings
Handle: digits with decimal, spelled numbers ("three point six seven"), "negative"/"minus", unit words ("volts", "V", "millivolts" -> /1000), common mis-hearings ("to" -> 2, "for" -> 4 when adjacent to numbers). Return `null` when ambiguous and ask "I heard three point six seven one volts, is that right?" only when confidence is low (alternatives disagree); otherwise accept and move on to keep the loop fast.

## Spoken phrasing (keep in `phrases.ts`)
- Instruction: "Touch row three. Say the reading when ready."
- Accepted: "Three point six seven one volts."
- Warning: "That reading did not come from row three. It most likely came from row two. Please try row three again."
- Diagnosis: "R3 is about ten times too small. Confidence ninety-eight percent."
- Unresolved: "I cannot separate two possibilities from voltages alone. I will not guess."
- Commands recognized at any time: "repeat", "again", "undo", "type instead", "stop".

## Accessibility coupling
Every spoken string also goes to `announce(text, 'polite' | 'assertive')` so screen-reader users who mute TTS still get it. Keyboard shortcut `Space` to start listening, `R` to repeat, `T` to focus the typed input.

## Testing
- `parseReading` table-driven tests. `voiceMachine` reducer tests for every transition including recognition error, no-speech timeout, and "type instead".
- Playwright: stub `window.SpeechRecognition` with a fake that resolves scripted transcripts; assert the LiveRegion text and store state.
