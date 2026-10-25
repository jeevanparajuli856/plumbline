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
- One `<Canvas>` in `scene/SceneRoot.tsx`, lazy-loaded with `React.lazy` + `Suspense` so the DOM UI paints first. `fallback` prop renders a DOM notice when WebGL is unavailable; the app must still work without the scene.
- `<Canvas dpr={[1, 1.75]} shadows camera={{ fov: 35, position: [...] }} frameloop="demand">` by default; call `invalidate()` on state changes. Switch to `frameloop="always"` only while an animation (probe travel, pendulum settle) is running, then back.
- Scene files: `Breadboard.tsx`, `Components.tsx` (LED, resistors, battery, wires), `Probe.tsx`, `NoisyHand.tsx`, `BeliefOverlay.tsx`, `PlumbLine.tsx`, `Lights.tsx`, `CameraRig.tsx`. Geometry constants in `scene/layout.ts` derived from the row map in the engine (row pitch, hole pitch 2.54 mm scaled).
- All scene state comes from the Zustand store. Scene components never own domain state; they render it.

## Per-frame work
- Mutate refs inside `useFrame((state, delta) => ...)`, scale by `delta`. Never `setState` inside `useFrame`.
- Read fast-changing store values with `useStore.getState()` inside `useFrame`, not via hooks that re-render.
- Reuse `THREE.Vector3`/`Color` instances created outside the frame loop; no allocations per frame.

## Geometry and materials
- Breadboard holes: drei `<Instances>`/`<Instance>` (one draw call for hundreds of holes). Rows that matter (1-6) get an emissive highlight instance layer.
- Shared materials and geometries via module-level constants or `useMemo`; dispose happens automatically on unmount for R3F-created objects; manually dispose anything created imperatively.
- Color management: default sRGB pipeline; do not set `linear`/`flat` unless matching a design decision.
- Staging: drei `<ContactShadows>` + `<Environment preset="studio">` or a custom 3-light rig; keep it readable, not glamorous.

## Interaction
- Pointer events on meshes (`onPointerOver/Out/Down`); set `document.body.style.cursor` through a small helper, restore on out.
- The probe can be aimed by click on a row, by keyboard (row number keys 1-6 + Enter), or by voice. All three dispatch the same store action `aimProbe(row)`; the noisy-hand model (seeded) decides the landed row inside the engine/state layer, never inside a component.
- `<OrbitControls>` with `enablePan={false}`, polar angle clamped so the board never flips; a "reset view" button in the DOM.

## Labels and overlays
- Row numbers and voltage callouts use drei `<Html transform occlude>` or `<Text>`; keep text in DOM where screen readers need it. Anything purely decorative in 3D has a DOM twin in `<LiveRegion>`/`<ReadingLog>`.
- Belief visualization: per-row placement posterior as bar heights or glow intensity on the board; fault posterior as a DOM chart (dataviz skill), not in 3D.

## Motion and accessibility
- Probe travel and pendulum settle use spring-like easing from `motion-foundations` tokens; `prefers-reduced-motion` snaps instead of animating.
- Nothing flashes faster than 3 Hz. Warning state uses color + shape + text, never color alone.

## Testing
- Pure math (layout, easing, posterior-to-color mapping) lives in `.ts` files with vitest tests.
- Components get a smoke test with `@react-three/test-renderer`: mounts, finds named objects (`name="probe"`), reacts to a store change.
- Performance check: `r3f-perf` or `stats.js` in dev only, behind `import.meta.env.DEV`.
