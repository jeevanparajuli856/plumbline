# Lane requests from `e2e` (lane/e2e)

Things the e2e lane needs that are outside its write surface (`apps/web/e2e/**`,
`apps/web/playwright.config.ts`). Each names the owner it is for.

## Status 2026-10-25

Settled on `main` (UI_CONTRACT section 6, decisions 1 to 9, and commit 5d566dc for the ignore
rule): items 1 to 9 and 13 below. Item 2 was then superseded by c9b7f53 (no `role="alert"` for
engine events; the banner is the focusable region "Placement warning"); the specs follow it.
Still open: 10 (web-shell contrast, checked in the full run), 11 and 12 (storyboard text), and 14.

## For the integration step on `main` (docs/UI_CONTRACT.md)

1. **RESOLVED.** **Live regions have no contract selector.** The slip-warning spec reads `#live-assertive` and
   `#live-polite` from `src/a11y/LiveRegion.tsx`. Please add them to UI_CONTRACT (ids are fine).
2. **RESOLVED.** **`getByRole('alert')` is ambiguous.** The assertive live region is also `role="alert"`, so the
   warning banner must be selected by `data-testid="warning-banner"`, never by role alone. Suggest
   the contract say so.
3. **RESOLVED.** **Landing Play controls.** F9 requires Play, Pause and Replay, but only "Play the 20-second
   example" is named. The landing spec uses buttons whose names start with "Pause" and "Replay"
   inside `section#play`. Please bind those names.
4. **RESOLVED.** **Aiming has no observable.** `1` to `9` aim at a row, but nothing in the contract shows the aimed
   row, so keyboard-only can only check that aiming submits nothing. Suggest a text "Aimed at row n"
   or `aria-current` on the placement strip item.
5. **RESOLVED.** **`?view=text` is only in ARCHITECTURE section 10.** no-webgl expects `/sim?view=text` to turn the
   "Text only" switch on. Please add the URL parameter to the contract.
6. **RESOLVED.** **`[` (Previous step) behaviour is not defined.** The store has no `replayPrev` action. The
   keyboard spec expects `[` after the diagnosis to return to one accepted reading, no diagnosis.
7. **RESOLVED.** **Replay pacing from outside.** The storyboard says pacing goes through `replayPlay(2000)`; `P`
   uses the 1800 ms default and nothing outside the store can set 2000. A `?pace=2000` parameter
   (or accepting 1800 in the storyboard) would close this.
8. **RESOLVED.** **`scene-ready` testid.** The storyboard (2.1) waits for `[data-testid="scene-ready"]`, which is
   not in the contract. The recording script uses `window.__plumblineScene.frames > 0` (contract
   section 3) instead. Either add the testid or update the storyboard.
9. **RESOLVED.** **Landing section indices in the storyboard.** Shot 2 says "section 1" for Problem and shot 9 says
   "section 7" for Close, but the contract order puts research at 1 and close at 9. The script
   scrolls to `section#problem` and `section#close` by id.

## For web-shell

10. **Contrast in the Sprint 0 `/sim` placeholder.** axe reports `serious color-contrast` on the
    "Next recorded reading" button (`.bg-inferred` with white text) in dark and hc. The placeholder
    is being replaced; make sure the new primary button passes. The `/sim` axe run is a full-run
    test until then.

## For docs (doc-updater, `docs/VIDEO_STORYBOARD.md` section 2.1)

11. The capture command in the storyboard is
    `pnpm exec playwright test e2e/record/video-v1.ts --project=chromium`, which finds no tests (the
    default projects ignore `e2e/record/`). The working command is
    `PLUMBLINE_RECORD=1 pnpm exec playwright test --project=record` (see `apps/web/e2e/README.md`).
12. The storyboard says the script waits for the scene, but each WebM also includes page load before
    the shot; `shots.json` has the trim points and the README has the trim loop. Worth one line in
    section 2.2.

## For the repo `.gitignore` (main)

13. **RESOLVED.** `recordings/*.webm` only matches a `recordings/` folder at the repo root. The video writes to
    `apps/web/recordings/video-v1/`. The script drops a `.gitignore` with `*` there at run time, but
    the root rule should be `**/recordings/` (or `apps/web/recordings/`) so it does not depend on the
    script.

## For web-shell (new)

14. **RESOLVED (decision 13: "Aim at <site label>").** **Aim button names.** Placement cells become buttons that aim, but their accessible names are
    not in the contract. The keyboard spec finds them inside the placement list by the site label
    (`/\brow 4\b/`). Please bind a name that contains the site label.

## New from the review fixes (2026-10-25)

15. **RESOLVED (decision 14: `data-testid="belief-verdict"`).** **Belief verdict selector.** refusal.spec expects the belief figure to show a verdict line
    starting "Unresolved" with no percentage. It finds it as text inside the figure
    `Belief over faults`. A named element (for example `data-testid="belief-verdict"`) would make
    it exact.
