# ADR-0009: PWA now, Capacitor wrapper for iOS at finals; no native rewrite

Status: accepted, 2026-10-25

## Context

The plan's goal is "open a path to iOS by the finals" (Dec 14 to 16). Blind users are more likely
to have an iPhone than a laptop in hand, and the voice loop runs on the phone's microphone. The
demo laptop must work with no network, and the replay path must work with no API (ADR-0005 and
ADR-0006). A web app that installs to the home screen and caches its assets meets the offline
need now. It does not give a native app identity or App Store distribution.

Rule 5 of `.claude/rules/00-plumbline.md` says "Do not build ... a mobile app". The plan's Capacitor
lane is a mobile app wrapper. That is a conflict with a rule the user has written, and this ADR
does not resolve it by itself. The user must amend rule 5 or drop the Capacitor lane. A native
rewrite in Swift would be a second codebase, which the scope rule also excludes.

## Decision

PWA first (Sprints 1 to 3):

- `vite-plugin-pwa` with `registerType: 'prompt'`, so a new version waits for the user's consent
  through an update toast.
- Precache the JS, CSS, HTML, woff2 fonts, SVG and PNG icons, and JSON fixtures. Navigation falls back
  to `/index.html`. `maximumFileSizeToCacheInBytes` is 3 MiB.
- Manifest: `start_url` is `/sim?mode=replay`, theme colour `#0B0D10`, icons at 192 and 512 (maskable)
  and an apple-touch icon at 180.
- Offline behavior is verified in Sprint 3. The replay path needs no network.

Capacitor iOS wrapper (Sprint 4, Nov 23 to Dec 6, a seven-day plan in `apps/ios`):

- Day 1: initialize the Capacitor project for iOS.
- Day 2: the speech adapter (`voice/adapters/capacitor.ts`) and the microphone and speech permission
  strings.
- Day 3: a VoiceOver pass.
- Day 4: TestFlight build.
- Day 5: a blind tester session (only if one is scheduled; not a claim that one exists).
- Day 6: fixes.
- Day 7: native screen recording.

The wrapper packages the same web build. The only native-specific code is the speech adapter and the
permission strings. No Swift or Kotlin screens are written.

## Consequences

Positive:

- One codebase. The PWA gives an installable, offline demo now, and the Capacitor shell adds an iOS
  path without a rewrite.
- The adapter boundary in `voice/` means the speech code is swapped, not forked.

Negative:

- Rule 5 conflicts with the Capacitor lane. Until the user amends rule 5 or drops the lane, the plan
  is not allowed by the project's own rules. This ADR records the conflict and does not claim the
  rule has changed.
- PWA recognition on iOS is unreliable in standalone mode according to the plan. The Capacitor
  adapter may help, but that is untested. The typed input stays visible (ADR-0008).
- Capacitor needs Xcode on a Mac, and TestFlight needs an Apple developer account. Neither is
  verified for this team, and the plan does not record that the account exists.

What to re-visit:

- Before Sprint 4, the user decides whether rule 5 is amended for the iOS wrapper. If not, drop the
  Capacitor lane and keep the PWA as the mobile story.
- After the blind tester session (if one happens), re-decide whether a native recording is needed for
  the finals.
- Re-check the Capacitor version and its iOS requirements against current docs before the lane starts.

## Alternatives considered

- **A native Swift app.** Rejected: a second codebase and a second write surface, both excluded by
  scope.
- **PWA only, no iOS path.** Kept as the fallback. It meets the offline need and the finals goal is
  still reachable if the wrapper is dropped.
- **React Native or Expo.** Not evaluated in this ADR. It would require rewriting the scene and the
  DOM panels, which the shared-tree design (ADR-0001, ADR-0007) avoids.
- **A mobile web page without an installable manifest.** Rejected: it has no offline replay and no
  home screen identity, and the offline need is the one that matters on demo day.
