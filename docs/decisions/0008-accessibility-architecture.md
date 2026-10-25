# ADR-0008: Accessibility architecture: DOM/aria-live twin for every 3D state; keyboard + voice drive everything; Web Speech API with typed fallback

Status: accepted, 2026-10-25

## Context

Rule 4 of `00-plumbline.md` says the primary user cannot see the screen. Every 3D state needs a DOM
and aria-live mirror and a spoken equivalent. Keyboard and voice must drive the whole demo flow. The
3D scene is for sighted judges, and the text and voice channel is the product.

The brief's sources explain why. The Michigan study (ASSETS 2024, 26 blind adults) describes
"epistemic labor": the user cannot tell whether an error is their picture-taking or the machine's.
The Stony Brook preprint (arXiv 2602.18623, February 2026, 14 blind users) reports fabricated or
self-contradicting answers that increase verification work. TangibleCircuits (CHI 2020) measured 27%
error identification with web tutorials. The plan's dossier summary records that Dristi (ULM, vision
assistance) placed third in the College track in 2025, so the accessibility lane has precedent at
this competition. These sources are cited from the brief and the plan. They were not re-read for
this ADR.

Two platform facts shape the voice design. Web Speech API recognition availability differs by
browser, and the plan says iOS Safari recognition is unreliable inside a standalone PWA. Neither
claim was tested in this session. The design therefore keeps a typed input always visible.

## Decision

1. **Twin for every 3D state.** Nothing informational lives only in 3D. Each scene state has a DOM
   text equivalent in the text channel. Row hitboxes are `visible={false}`, labels are drei `Html`
   marked `aria-hidden`, and the Canvas wrapper is `role="img"` with a label. A test pins the
   hitbox visibility.
2. **One announcer.** `a11y/announcer.ts` is a store subscriber and the only event mirror.
   `announce(text, {priority, dedupeMs = 1500, force})` queues messages. Polite messages drain one
   per 700 ms. An assertive message clears the polite queue. Warnings are assertive. Instructions,
   accepted readings, the likely row, and diagnosis or refusal sentences are polite. Blocking errors
   are assertive. Two live regions live in `a11y/LiveRegion.tsx`.
3. **Keyboard map.** `1` to `9` aim the probe at a row, `Enter` submits, `T` opens typed input, `M`
   starts the microphone (not Space, which scrolls and activates buttons), `V` toggles speech output,
   `R` repeats the instruction, `L` opens the log, `P` plays or pauses replay, `[` and `]` step,
   `?` opens the key map, and `Esc` closes. Shortcuts ignore editable targets and modifier keys. Every
   shortcut is also a button with `aria-keyshortcuts`.
4. **Voice input and output.** `voice/listen.ts` and `voice/speak.ts` sit behind adapter interfaces
   (web now, Capacitor later, ADR-0009). `voiceMachine` is a pure reducer that emits effects.
   `parseReading` is table-driven with 30 or more rows. The machine asks for confirmation only when
   the alternatives disagree. Speech output is OFF by default. The aria-live text is always on, so
   a screen reader user does not hear each message twice. Utterances are chunked under 200 characters,
   and any pending speech is cancelled before an assertive message. On iOS, `unlock()` runs on the
   first user gesture.
5. **Focus management.** A route change moves focus to the h1. Awaiting a reading moves focus to the
   reading input. A warning moves focus to the WarningBanner (`role="alert"`). A resolved state moves
   focus to the DiagnosisCard. An error moves focus to its sentence. Skip links are in the App shell.
   Focus rings are double (`--focus` plus `--focus-gap`).
6. **Checks.** Playwright runs axe and expects zero serious or critical violations in three themes.
   Lighthouse accessibility is a target of 100, not a measured result yet. Every UI lane gets an
   `a11y-auditor` pass. A blindfold replay in Chrome is part of the voice lane, and a VoiceOver pass
   on macOS and iOS is part of the Capacitor plan.

## Consequences

Positive:

- The primary user gets the same information through text, keyboard, and optional speech. The
  judges get the 3D scene with the same content.
- The keyboard map is documented in the app and tested, so the flow does not depend on speech.
- The OFF-by-default speech choice avoids double speech for screen reader users.

Negative:

- The text channel is a second view with its own tests. Every new scene state needs its twin.
- Recognition reliability on iOS and in Chrome is unverified. The typed fallback must always work,
  so the voice path is an enhancement, not the only input.
- Three themes and the high-contrast mode multiply the axe run.

What to re-visit:

- After the blindfold run and the Ruston sessions, decide whether speech should default on for
  users who turn on a screen reader or choose it, and whether the 200 character chunk length holds.
- After the VoiceOver pass, re-check the M key and the focus order on iOS.
- Confirm current Web Speech API support and the standalone PWA behavior before the finals. Fetch
  current docs first (CLAUDE.md rule 4).

## Alternatives considered

- **Speech on by default.** Rejected for now: it doubles output for screen reader users and makes
  the default experience noisy. It may be revisited after user sessions.
- **Space as the microphone key.** Rejected: Space scrolls the page and activates focused buttons,
  which fights the screen reader and the keyboard flow.
- **Scene-first with alt text only.** Rejected: a canvas cannot be followed by a screen reader, and
  rule 4 requires a live twin.
- **A cloud speech API.** Rejected: it needs keys in the app (ADR-0010 bans keys in the app), it
  adds a network dependency to the voice loop, and the browser's built-in API needs neither.
