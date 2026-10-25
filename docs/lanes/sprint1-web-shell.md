# Lane requests: web-shell

Changes this lane needs on frozen surfaces, or decisions for the integration step on `main`. Each item says what we did meanwhile.

Status after the review merge (2026-10-25): 2, 5 and 8 are resolved on `main` (LiveRegion without `role="alert"`, the banner is a region, one app-wide Reduce motion switch in UI_CONTRACT, EVIDENCE.md row 17 reworded). 3 is decided in UI_CONTRACT 6.4 (announcer side pending on `main`). 4 stays open: `stepBack` now has an in-flight guard, but intermediate steps are still announced because `silent` is start-only; the lead is adding `replayPrevious` on `main`. New: a "Single-key shortcuts" switch (WCAG 2.1.4) lives in the shortcuts dialog, state in `a11y/shortcutPref.ts` (`localStorage['truehand.singleKeyShortcuts']`, `'0'` when off); contract name `getByRole('switch', { name: 'Single-key shortcuts' })`.

## 1. `vite.config.ts`: fonts are 403 in `pnpm dev`

`server.fs.allow` is `['.', fixturesDir, docsDir]`. The fontsource files resolve to the workspace root `node_modules/.pnpm/...`, outside the allow list, so the dev server answers 403 and the page falls back to system fonts. Production builds are fine (fonts are bundled).

Request: add the workspace root, e.g. `import { searchForWorkspaceRoot } from 'vite'` and `allow: [searchForWorkspaceRoot(process.cwd()), fixturesDir, docsDir]`.
Meanwhile: screenshots were taken against `vite build` + `vite preview`.

## 2. Two `role="alert"` elements and a double warning announcement

`a11y/LiveRegion.tsx` renders `#live-assertive` with `role="alert"`, and the UI contract requires the warning banner to be `role="alert"` too. Effects:

- `getByRole('alert')` matches two elements whenever both exist (the smoke spec uses `.first()`; strict specs will need the `warning-banner` test id).
- A screen reader may hear the warning twice: once from the announcer (assertive) and once from the banner's implicit live region, and focus also moves to the banner.

Request (integration decision, a11y-auditor to confirm): either change `#live-assertive` to `aria-live="assertive"` without `role="alert"`, or let the banner drop `role="alert"` and rely on focus plus the announcer. The banner keeps the contract until then.

## 3. Aiming (keys 1 to 9) has no spoken feedback

`aimProbe(site)` changes `aimedSite`, which the announcer does not mirror. The placement strip shows "aimed" visually, but a blind user gets nothing. Components must not call `announce()` for engine state, so this lane left it.
Request: announcer mirrors `aimedSite` changes politely, e.g. "Aiming at row 2."

## 4. No previous-step action in the store

`[` needs "previous step". The store only plays forward, so `sim/replayNav.ts` `stepBack()` does `reset()` and replays `stepIndex - 1` steps, finishing each reveal immediately. It works and is tested against the provisional fixture, but the announcer speaks the instruction and the warning of the step it lands on (that is the right final state; intermediate steps are short-circuited).
Request (optional): `replayPrevious()` in `state/session.ts`.

## 5. One "Reduce motion" switch for the whole app

The landing contract names `getByRole('switch', { name: 'Reduce motion' })`. Design rule F16 puts theme, text-only and reduce-motion first in the tab order after the skip link, so this lane renders them in a site-wide Display bar (`ui/PrefsBar.tsx`) on every page, including `/`. If the landing lane also renders its own Reduce motion switch, `/` will have two and the selector becomes ambiguous.
State lives in `a11y/motionPref.ts` (`useMotionPref`, persisted to `localStorage['truehand.reduceMotion']`, mirrored to `<html data-reduce-motion="true">`, which zeroes the motion tokens in `index.css`). `prefersReducedMotion()` in `a11y/useReducedMotion.ts` now returns OS setting OR this switch, so the store's reveal gate and the scene both honor it.
Request: landing reads `useMotionPref` / `useReducedMotion()` and does not render a second switch.

## 6. System theme classes

`tokens.css` keys the OS-following themes off `:root:not([data-theme]).prefers-dark` and `.prefers-hc`, but nothing set those classes. `ui/useSystemTheme.ts` (called from `App.tsx`) now sets them from `prefers-color-scheme`, `prefers-contrast: more` and `forced-colors: active` while the theme is System. No frozen change needed; recorded so integration knows where it lives.

## 7. Brief expectations withheld on `/evidence`

`docs/EVIDENCE.md` says the brief's figures "are not shown in the UI", but several readiness rows carry them inline ("brief expected 63.5 / 97.6 / 100.0", "Brief expectation: 99.0 +/- 0.4% ..."). The page renders the file at runtime, so `evidence/markdown.ts` `withholdBriefExpectations()` removes those clauses and the row says "The brief's expected figure is withheld until we reproduce it here." Scratch numbers stay (labeled scratch, allowed by ADR-0004).
Request (doc owner): consider moving brief expectations out of the table column so the source matches what is shown.

## 8. Organization name on `/evidence`

Rule F21 (DESIGN_REFERENCES F): no partner or organization name without written permission on file. The readiness table, rendered verbatim, names the Louisiana Center for the Blind (row 17) and its street address. `/about` avoids the name in its own copy. Team to confirm permission, or edit the row in `docs/EVIDENCE.md`.

## 9. Small notes

- Simulate mode: the store ignores the value in simulate (`step(sessionId, null)`), but `submitReading` validates it first, so the form passes `0` with source `simulated`. A `submitSimulated()` action would read better.
- Thermometer in replay mode asks for the `thermometer_demo` recording; until the engine records it the page shows "That recording is not available here." (honest, not a bug).
- The Sprint 0 `SceneHost` wrapper (`role="img"`, absolute, outside `<main>`) is the only axe finding on `/sim` (moderate `region`). It goes away when the scene lane portals into `#scene-slot`, which is inside `<main>`.
