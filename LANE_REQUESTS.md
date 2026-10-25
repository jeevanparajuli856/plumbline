# Lane requests from `lane/scene`

Changes the scene lane needs outside `apps/web/src/scene/**`. Nothing here was edited by this lane.

## 1. `apps/web/vite.config.ts`: the 3D chunk is preloaded on `/` (owner: integration / config)

**Resolved** by main 91186b4 (manualChunks removed, size-limit measures SceneRoot), merged into lane/scene.

`manualChunks` sends React's runtime and `zustand` / `use-sync-external-store` into the `r3f` chunk, because R3F depends on them too. The entry chunk then imports from `r3f`, and `dist/index.html` gets `<link rel="modulepreload" href="/assets/r3f-*.js">`. Result: 315 kB gz of three + R3F + drei downloads on `/` before the scene ever mounts, which breaks the "not loaded on `/` until the scene mounts" budget.

Measured with `vite build` in this worktree on 2026-10-25:

| Config                                  | Entry (gz)                                                 | Lazy 3D (gz)      | 3D preloaded on `/`? |
| --------------------------------------- | ---------------------------------------------------------- | ----------------- | -------------------- |
| current `manualChunks`                  | index 67 kB + r3f 315 kB (preloaded) + three 1.1 kB        | SceneRoot 11.9 kB | yes                  |
| plus a `vendor` chunk for react/zustand | index 67 kB + vendor 1.5 kB + r3f 319 kB (still preloaded) | SceneRoot 11.7 kB | yes                  |
| `manualChunks` removed                  | index 135 kB                                               | SceneRoot 260 kB  | **no**               |

Request: remove `build.rollupOptions.output.manualChunks` and point the `size-limit` entry "three + r3f chunk" at `dist/assets/SceneRoot-*.js` (limit 700 kB stays). App JS stays under 300 kB.

## 2. `apps/web/vite.config.ts`: fonts 403 in dev (owner: integration / config)

**Resolved** by main 91186b4 (`server.fs.allow` includes the workspace root).

`server.fs.allow` lists `'.'`, fixtures and docs but not the workspace root, so Vite refuses the fontsource files in the pnpm store (`/@fs/.../node_modules/.pnpm/@fontsource+ibm-plex-sans@5.3.0/.../*.woff2` returns 403). The dev server falls back to system fonts. Request: add `searchForWorkspaceRoot(process.cwd())` from `vite` to `server.fs.allow`.

## 3. `styles/tokens.json` -> `tokens.css`: physical scene colours (owner: ui-designer)

`scene/tokens.ts` already reads these and falls back to `hsl()` values until they exist. They are physical materials, not UI semantics, but should still follow light, dark and high-contrast themes:
`--scene-probe`, `--scene-lead`, `--scene-metal`, `--scene-resistor`, `--scene-led`, `--scene-battery`, `--scene-rail-positive`, `--scene-rail-negative`, `--scene-roast-crust`, `--scene-roast-centre`.
Resistor colour-code bands stay as fixed physical hues in `scene/resistorBands.ts`.

## 4. `/sim` layout (owner: web-shell)

- Render `<div id="scene-slot">` with an explicit height (the Canvas fills its parent; a 0-height slot is a 0-height canvas). Wide slots look best; the scene fits its camera distance to the slot's aspect.
- A "Reset view" button: `import { requestViewReset } from '@/scene/viewControl'` (imports nothing from three, so it does not pull the lazy chunk).
- `SceneHost` keeps `data-testid="scene"` and `role="img"` on the wrapper and moves one host node between the landing layer and the slot, so do not wrap the slot in anything that remounts on phase changes.

## 5. DOM twins for what the scene draws (owner: a11y-auditor / web-shell)

The scene never announces. Each state below needs a text twin in the DOM panels (most already exist in the UI contract):

| Scene state            | Shape and colour                                                                                                 | DOM twin                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Told row               | dashed cyan frame around the row                                                                                 | instruction heading "Touch the red probe to row N"                     |
| Warning                | solid, heavier vermilion frame on the told row plus "! Warning: probe not here" tag, shown only after the reveal | focusable `role="region"` named "Placement warning", not a live region |
| Landed row             | amber fill, only after `finishReveal`                                                                            | reading log "Landed" column                                            |
| Placement posterior    | cyan glow strip per row on the f-j half, intensity sqrt(p) scaled by `--scene-glow-max`                          | placement list "Where the probe landed" with percentages               |
| Plumb line             | one swing per entropy change, amplitude entropy / max entropy up to 18 deg; rests over the diagnosed part        | "Uncertainty: high/low" caption and the diagnosis region               |
| Reduced motion bracket | static cyan bracket over told row +/- 2 (awaiting) or over the unresolved parts' rows                            | "The probe may be on rows A to B." and the unresolved region           |
| Roast                  | SIMULATED badge in scene                                                                                         | SIMULATED badge in the DOM for the whole session                       |

## 6. Landing choreography (owner: landing)

- `poseAt` returns `SIM_POSE` today. The sim no longer uses `SIM_POSE`'s distance: it keeps its direction and fits the distance to the slot (`scene/framing.ts`). Landing keyframes should carry their own camera; at 0.4 m the board fills about 30 % of a wide frame.
- `explode` is drawn by lifting the hand-confusion plane (told and warning frames) 25 mm and the belief plane (glow strips) 50 mm along the board normal (world y). "Separate in z" in the choreography was read as stacking along the normal; say so if a different axis was meant.
- On the landing only the SIMULATED badge and warning tag render as labels; row and part labels are sim only.

## 7. State and engine (owner: integration)

- No store action reports a lost WebGL context, so the scene cannot set the `webgl_lost` error. Request a `reportSceneLost()` action (or similar) in `state/session.ts`.
- The catalog does not expose the confusion model (0.78 / 0.08 / 0.03). A hand-confusion fan for "how" (math line 1) needs it; not built. The tremor uses `DEFAULT_P_SAME = 0.78` only before any reading, when `placement` is all zeros.

## 8. Docs (owner: doc-updater)

ARCHITECTURE section 8 draw-call table: replace with the measured numbers (circuit 24 to 25, roast 8 to 9, landing mount frame 48 including the one-shot ContactShadows passes, landing steady 23).
