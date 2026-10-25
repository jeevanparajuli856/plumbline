---
name: threejs-r3f
description: Build the Plumbline 3D simulation with React Three Fiber and drei - one app-level Canvas shared by landing and simulator, breadboard, circuit components, probe, seeded noisy-hand reveal, belief overlays, plumb-line motif, roast cross-section for the thermometer domain, camera rig, on-demand rendering with an animation ref-count, instancing, pointer and keyboard interaction, DOM accessibility mirror, and smoke tests. Use for anything rendered inside the Canvas or when planning the scene architecture.
argument-hint: "[component or problem, e.g. 'probe landing animation']"
---

# Three.js / React Three Fiber for Plumbline

Rules live in `.claude/rules/three-r3f.md` (auto-loaded for `apps/web/src/scene/**`). This skill is the how-to. Fresh API docs: `npx ctx7@latest docs /pmndrs/react-three-fiber "<topic>"` and `/pmndrs/drei`. Snapshots fetched 2026-10-25 are in `references/`.

## Stack
`three`, `@react-three/fiber` (v9 for React 19), `@react-three/drei`, dev-only `r3f-perf`. No `@react-three/postprocessing`: glow is emissive plus one additive halo quad. No `<Environment preset>`: presets fetch an HDR from a CDN and the app must work as an offline PWA; use the custom light rig in `Lights.tsx`. Tests with `@react-three/test-renderer`.

## Scene architecture
```
apps/web/src/scene/
  SceneHost.tsx        mounted once in App.tsx (lazy); reads sceneMode from the store; role="img" wrapper with a label; renders SceneUnavailable when WebGL is missing
  SceneRoot.tsx        <Canvas> + Suspense + fallback + perf overlay (DEV)
  SceneUnavailable.tsx DOM notice; the app still works through the text channel
  CameraRig.tsx        lerps camera toward poseAt(progress) on landing; OrbitControls (no pan, clamped) in sim; disabled during scripted moves
  Lights.tsx           custom rig: one shadow-casting key (1024 map), fill, rim, <ContactShadows>; no HDR, no CDN
  PlumbLine.tsx        pendulum; amplitude = entropyBits / maxEntropyBits -> [0, 18 deg]; rests over the diagnosed part; alternates between two parts every 3 s when unresolved
  Labels.tsx           drei <Html> row and depth labels, aria-hidden (the DOM has the real labels)
  useAnimating.ts      ref-count hook; frameloop is 'always' while count > 0, else 'demand'
  tokens.ts            reads CSS tokens via getComputedStyle + MutationObserver on data-theme
  layout.ts            pure: row -> world position, pitch constants, board dims
  roastLayout.ts       pure: depth (cm) -> world position in the lathe cross-section
  colorScale.ts        pure: probability -> emissive intensity and color using tokens
  easing.ts            pure: springs (gentle, release), arcPath helper
  breadboard/
    Breadboard.tsx     slab + <Instances> hole grid + highlight strip <Instances>
    Components.tsx     LED, resistors, 9 V battery, merged jumper wires from layout.ts
    Probe.tsx          red probe mesh name="probe"; tremor; arc-path reveal; black lead on GND
    NoisyHand.tsx      told site outline (cyan) vs landed site fill (amber, only after reveal)
    BeliefOverlay.tsx  per-site placement posterior as emissive strips
    RowHitboxes.tsx    invisible boxes per row (visible={false}, still raycast); onClick -> aimProbe
  roast/
    Roast.tsx          lathe cross-section, hidden when sceneMode domain is circuit
    DepthBands.tsx     six depth bands, SIMULATED badge twin lives in the DOM
    ThermoProbe.tsx    axial probe
    DepthHitboxes.tsx  invisible, raycast, onClick -> aimProbe(site)
  __tests__/           vitest + test-renderer smoke tests
```
`sceneMode` is `landing | sim | hidden`; one Canvas serves both routes and the camera flies between poses.

The scene reads from the Zustand store (`src/state/session.ts`): `instruction`, `aimedSite`, `placement[6]` (placement posterior), `entropyBits`, `maxEntropyBits`, `warning`, `phase`, `reveal {landedSite, token, next}`, `landedSite` (written only inside `finishReveal`), `domain`. Sites are 0-based indices; labels come from `catalog.sites[i].label`.

## The reveal contract
Phases: `idle | starting | awaiting_reading | submitting | revealing | resolved | unresolved | error`. When a reading is accepted and a landed site exists, the store enters `revealing` with `reveal = {landedSite, token, next}`. The scene animates the probe along `arcPath` (lift 8 mm, `springs.gentle`, contact dip 1.5 mm) to `reveal.landedSite`, then calls `finishReveal(token)`. The store ignores stale tokens, writes `landedSite`, and moves to `reveal.next`. With reduced motion or no WebGL the store calls `finishReveal` itself. Never render the landed site before `revealing`; before that the probe trembles toward the told site so the audience sees uncertainty without seeing the answer.

## Canvas setup
```tsx
<Canvas
  dpr={[1, 1.75]}
  shadows
  frameloop={animating ? 'always' : 'demand'}
  camera={{ fov: 35, near: 0.01, far: 5, position: [0.18, 0.22, 0.28] }}
  gl={{ antialias: true, powerPreference: 'high-performance' }}
  fallback={<SceneUnavailable />}
  onCreated={({ gl }) => gl.setClearColor(tokens.sceneBg)}
>
```
Units are meters (hole pitch 0.00254 m), hence near 0.01 and far 5. `animating` comes from `useAnimating()`; every component that runs a transient animation increments on start and decrements on settle. Call `invalidate()` after store updates when in demand mode; the camera rig invalidates only within 300 ms of a scroll event.

## Per-frame pattern
```tsx
const ref = useRef<THREE.Mesh>(null!)
const target = useMemo(() => new THREE.Vector3(), [])
useFrame((_, delta) => {
  const { aimedSite, placement } = useSession.getState()
  target.copy(layout.sitePosition(aimedSite))
  ref.current.position.lerp(target, 1 - Math.exp(-delta * 10)) // frame-rate independent
})
```
No `setState` in `useFrame`, no allocations in the loop, scale everything by `delta`.

Probe tremor: sum of sines at 1.3 Hz and 2.1 Hz, amplitude 0.6 mm x (1 - P(l = n)), seeded from the session so recordings repeat.

## Instancing the holes
```tsx
<Instances limit={HOLE_COUNT} range={HOLE_COUNT}>
  <cylinderGeometry args={[0.0006, 0.0006, 0.002, 8]} />
  <meshStandardMaterial color={tokens.sceneHole} />
  {holes.map((p, i) => <Instance key={i} position={p} />)}
</Instances>
```
Highlight strips: a second small `<Instances>` whose `emissiveIntensity = colorScale(placement[i]) * sceneGlowMax`. Warning turns the told-site outline to the warning token.

## Draw-call budget
Target about 27 (budget 150): slab 2, holes 1, highlight strips 1, told outline 1, components 7, merged wires 1, probe 3, black lead 2, plumb line 3, fan 1, ContactShadows 2. Roast adds about 12 and is hidden when the circuit is showing.

## Interaction
- `RowHitboxes` and `DepthHitboxes` are `visible={false}` meshes. Three's raycaster ignores visibility, so they still receive `onPointerOver/Out/Click`. A test pins this: mount, dispatch a raycast at hitbox 3, assert `aimProbe(2)` fired (0-based). Do not switch to `raycast={() => null}` on them by mistake; that is how you disable raycast.
- Keyboard: `useKeyboardMap` in `src/a11y/` maps `1`-`9` + `Enter` to `aimProbe`/submit. Voice dispatches the same actions. The scene never owns input.
- The engine or state layer samples the landed site from the confusion model with the session seed; the scene only reads `reveal`.

## Labels and DOM mirror
Row and depth labels: drei `<Html transform distanceFactor={0.3} occlude>` with `aria-hidden="true"`; screen readers get the DOM labels in the sim panels. The Canvas wrapper is `role="img"` with an `aria-label` that names the domain and current state. Every scene state change is already mirrored by `a11y/announcer.ts` (the only event mirror); scene components never call `announce()` themselves.

## Performance checklist
- [ ] `frameloop="demand"` idles at 0 fps when `useAnimating()` count is 0
- [ ] < 150 draw calls (target about 27; check `r3f-perf` in DEV)
- [ ] dpr clamped, shadows only from the key light with a 1024 map
- [ ] three/R3F/drei in a lazy chunk (< 700 kB gz) and not loaded on `/` until the scene mounts
- [ ] no per-frame allocations (search for `new THREE.` inside `useFrame`)
- [ ] no network fetch from the scene (no `<Environment preset>`, no remote textures)

## Testing
```ts
import ReactThreeTestRenderer from '@react-three/test-renderer'
const r = await ReactThreeTestRenderer.create(<Probe />)
expect(r.scene.findByProps({ name: 'probe' })).toBeTruthy()
```
Smoke set: probe, plumb line, row hitbox 3, `aimProbe` moves the target, domain switch swaps breadboard for roast. Pure helpers (`layout.ts`, `roastLayout.ts`, `colorScale.ts`, `easing.ts`, `landing/choreography.ts`) get ordinary vitest unit tests with exact numbers.

## Pitfalls
- Importing `three/examples/jsm/...` pulls large code; prefer drei wrappers.
- `OrbitControls` fights camera animations; disable it during scripted camera moves and on the landing route.
- `<Html>` elements are DOM nodes outside the page layout tree; style them with the same tokens and keep them aria-hidden.
- drei `ScrollControls` hijacks document scroll and breaks screen readers; the landing uses DOM scroll progress -> `poseAt(progress)` instead.
- Hot reload can leak WebGL contexts in dev; if "too many contexts" appears, reload the tab.
