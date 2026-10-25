---
paths:
  - "apps/web/src/scene/**"
  - "**/*.three.ts"
  - "**/*.three.tsx"
  - "**/three/**"
---
# React Three Fiber scene rules

Verified against R3F docs (Context7 `/pmndrs/react-three-fiber`, `/pmndrs/drei`) on 2026-10-25. Re-fetch before using an API you have not used in this repo.

## Structure
- One `<Canvas>` for the whole app, mounted once by `scene/SceneHost.tsx` from `App.tsx`, lazy-loaded with `React.lazy` + `Suspense` so the DOM UI paints first. `sceneMode` in the store is `landing | sim | hidden`; the camera flies between poses rather than remounting. `fallback` renders `SceneUnavailable`; the app must still work without the scene.
- `<Canvas dpr={[1, 1.75]} shadows camera={{ fov: 35, near: 0.01, far: 5, position: [...] }} frameloop={animating ? 'always' : 'demand'}>`. `animating` comes from `useAnimating()`, a ref-count hook; call `invalidate()` on state changes while in demand mode.
- Scene files: `SceneHost.tsx`, `SceneRoot.tsx`, `SceneUnavailable.tsx`, `CameraRig.tsx`, `Lights.tsx`, `PlumbLine.tsx`, `Labels.tsx`, `useAnimating.ts`, `tokens.ts`, `layout.ts`, `roastLayout.ts`, `colorScale.ts`, `easing.ts`; `breadboard/{Breadboard,Components,Probe,NoisyHand,BeliefOverlay,RowHitboxes}.tsx`; `roast/{Roast,DepthBands,ThermoProbe,DepthHitboxes}.tsx`. Geometry constants in `layout.ts` derive from the engine's site map (hole pitch 2.54 mm, units in meters).
- All scene state comes from the Zustand store: `placement`, `entropyBits`, `maxEntropyBits`, `landedSite`, `aimedSite`, `instruction`, `warning`, `phase`, `reveal`, `domain`. Scene components never own domain state; they render it.

## The reveal
- Phase `revealing` carries `reveal {landedSite, token, next}`. The scene animates the probe to `reveal.landedSite` and then calls `finishReveal(token)`; the store ignores stale tokens, writes `landedSite`, and moves to `reveal.next`. With reduced motion or no WebGL the store calls `finishReveal` itself.
- Never read or draw the landed site before `revealing`. Before that the probe trembles toward the told site (amplitude 0.6 mm x (1 - p_same) / (1 - 0.78), p_same from the confusion prior, seeded; see ARCHITECTURE section 8).

## Per-frame work
- Mutate refs inside `useFrame((state, delta) => ...)`, scale by `delta`. Never `setState` inside `useFrame`.
- Read fast-changing store values with `useStore.getState()` inside `useFrame`, not via hooks that re-render.
- Reuse `THREE.Vector3`/`Color` instances created outside the frame loop; no allocations per frame.

## Geometry and materials
- Breadboard holes: drei `<Instances>`/`<Instance>` (one draw call for hundreds of holes). Sites get an emissive highlight instance layer driven by `placement` through `colorScale.ts`.
- Shared materials and geometries via module-level constants or `useMemo`; dispose happens automatically on unmount for R3F-created objects; manually dispose anything created imperatively.
- Color management: default sRGB pipeline; do not set `linear`/`flat` unless matching a design decision.
- Staging: custom light rig in `Lights.tsx` (one shadow-casting key with a 1024 map, fill, rim) plus drei `<ContactShadows>`. No `<Environment preset>`: it fetches an HDR from a CDN and the PWA must work offline. No postprocessing; glow is emissive plus one additive halo quad. Keep it readable, not glamorous.
- Draw-call budget 150; target about 27 for the circuit scene.

## Interaction
- Pointer events on meshes (`onPointerOver/Out/Down`); set `document.body.style.cursor` through a small helper, restore on out.
- Hitboxes (`RowHitboxes`, `DepthHitboxes`) are `visible={false}` meshes; the raycaster ignores visibility so they still receive events. A test-renderer test pins this behavior. Disabling raycast is `raycast={() => null}`, not `visible={false}`.
- The probe can be aimed by click on a site, by keyboard (`1`-`9` + `Enter`, handled in `a11y/useKeyboardMap`), or by voice. All three dispatch the same store action `aimProbe(site)` (0-based); the noisy-hand model (seeded) decides the landed site inside the engine/state layer, never inside a component.
- `<OrbitControls>` with `enablePan={false}`, polar angle clamped so the board never flips; disabled on the landing route and during scripted camera moves; a "reset view" button in the DOM.

## Labels and overlays
- Row and depth labels use drei `<Html transform occlude>` with `aria-hidden="true"`; the DOM panels carry the real labels. The Canvas wrapper is `role="img"` with an `aria-label`. Anything that carries information has a DOM twin; the only event mirror is `a11y/announcer.ts`, and scene components never call `announce()`.
- Belief visualization: per-site placement posterior as glow intensity on the board; fault posterior as a DOM chart (`ui/BeliefChart`, dataviz skill), not in 3D.
- Plumb line amplitude = `entropyBits / maxEntropyBits` mapped to [0, 18 deg]; rests over the diagnosed component; alternates between the two candidates every 3 s when unresolved.

## Motion and accessibility
- Probe travel and pendulum settle use spring-like easing from `motion-foundations` tokens; `prefers-reduced-motion` snaps instead of animating and shows a static +/-2 bracket instead of the tremor.
- Nothing flashes faster than 3 Hz. Warning state uses color + shape + text, never color alone.

## Testing
- Pure math (layout, roastLayout, easing, colorScale, choreography) lives in `.ts` files with vitest tests and exact numbers.
- Components get a smoke test with `@react-three/test-renderer`: mounts, finds named objects (`name="probe"`), hitbox 3 raycasts while invisible, `aimProbe` moves the target, domain switch swaps scenes.
- Performance check: `r3f-perf` or `stats.js` in dev only, behind `import.meta.env.DEV`.
