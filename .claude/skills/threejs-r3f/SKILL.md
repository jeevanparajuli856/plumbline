---
name: threejs-r3f
description: Build the Plumbline 3D simulation with React Three Fiber and drei - breadboard, circuit components, probe, seeded noisy-hand landing, belief overlays, plumb-line motif, camera rig, on-demand rendering, instancing, pointer and keyboard interaction, DOM accessibility mirror, and smoke tests. Use for anything rendered inside the Canvas or when planning the scene architecture.
argument-hint: "[component or problem, e.g. 'probe landing animation']"
---

# Three.js / React Three Fiber for Plumbline

Rules live in `.claude/rules/three-r3f.md` (auto-loaded for `apps/web/src/scene/**`). This skill is the how-to. Fresh API docs: `npx ctx7@latest docs /pmndrs/react-three-fiber "<topic>"` and `/pmndrs/drei`. Snapshots fetched 2026-10-25 are in `references/`.

## Stack
`three`, `@react-three/fiber` (v9 for React 19), `@react-three/drei`, optional `@react-three/postprocessing` (only if a judged visual needs it), dev-only `r3f-perf`. Tests with `@react-three/test-renderer`.

## Scene architecture
```
apps/web/src/scene/
  SceneRoot.tsx        <Canvas> + Suspense + fallback + perf overlay (DEV)
  CameraRig.tsx        OrbitControls (no pan, clamped polar), reset-view action
  Lights.tsx           key/fill/rim or <Environment preset="studio"> + <ContactShadows>
  Breadboard.tsx       board body + <Instances> hole grid + row highlight layer
  Components.tsx       LED, resistors, 9 V battery, jumper wires from layout.ts
  Probe.tsx            black probe mesh, name="probe", travel animation via ref
  NoisyHand.tsx        visualizes instructed row (outline) vs landed row (fill)
  BeliefOverlay.tsx    per-row placement posterior as glow/bars on the board
  PlumbLine.tsx        pendulum that settles as fault entropy drops
  layout.ts            pure: row -> world position, pitch constants, board dims
  colorScale.ts        pure: probability -> color/intensity using tokens
  easing.ts            pure: spring/ease helpers shared with motion tokens
  __tests__/           vitest + test-renderer smoke tests
```
The scene reads from the Zustand store (`src/state/session.ts`): `instruction`, `landedRow` (only after a reading is accepted, never before, or the demo leaks the answer), `placementPosterior[6]`, `beliefEntropy`, `warning`, `phase`.

## Canvas setup
```tsx
<Canvas
  dpr={[1, 1.75]}
  shadows
  frameloop={animating ? 'always' : 'demand'}
  camera={{ fov: 35, near: 0.1, far: 50, position: [0.18, 0.22, 0.28] }}
  gl={{ antialias: true, powerPreference: 'high-performance' }}
  fallback={<SceneUnavailable />}
  onCreated={({ gl }) => gl.setClearColor(tokens.sceneBg)}
>
```
Call `useThree(s => s.invalidate)` after store updates when in demand mode. Keep units in meters; breadboard hole pitch is 0.00254 m, scale the whole group if the camera math gets awkward.

## Per-frame pattern
```tsx
const ref = useRef<THREE.Mesh>(null!)
const target = useMemo(() => new THREE.Vector3(), [])
useFrame((_, delta) => {
  const { probeTarget } = useSession.getState()
  target.set(...probeTarget)
  ref.current.position.lerp(target, 1 - Math.exp(-delta * 10)) // frame-rate independent
})
```
No `setState` in `useFrame`, no allocations in the loop, scale everything by `delta`.

## Instancing the holes
```tsx
<Instances limit={HOLE_COUNT} range={HOLE_COUNT}>
  <cylinderGeometry args={[0.0006, 0.0006, 0.002, 8]} />
  <meshStandardMaterial color={tokens.hole} />
  {holes.map((p, i) => <Instance key={i} position={p} />)}
</Instances>
```
Highlighted rows: a second small `<Instances>` with an emissive material whose `color`/`emissiveIntensity` is driven from `placementPosterior` through `colorScale.ts`.

## Interaction
- `onPointerOver/Out` on row hit-boxes (invisible thin boxes per row, `visible={false}` still raycasts when `raycast` is default) to show a hover outline; `onClick` dispatches `aimProbe(row)`.
- Keyboard: a DOM listener in `useKeyboardAim` maps `1`-`6` + `Enter` to `aimProbe`. Voice dispatches the same action.
- The engine/state layer samples the landed row from the confusion model with the session seed; the scene animates the probe to the landed row only after the reading is revealed. Until then it animates toward the instructed row with a subtle hand-tremor offset so the sighted audience sees the uncertainty without seeing the answer.

## Labels and DOM mirror
Row numbers: drei `<Html transform distanceFactor={0.3} occlude>` or `<Text>` with the mono font. Every scene state change also dispatches an announcement through `announce()` in `src/a11y/liveRegion.ts`. Decorative-only elements need no mirror; anything that carries information does.

## Performance checklist
- [ ] `frameloop="demand"` idles at 0 fps when nothing moves
- [ ] < 150 draw calls (check `r3f-perf` in DEV)
- [ ] dpr clamped, shadows only from the key light with a 1024 map
- [ ] three/R3F/drei in a lazy chunk, scene route code-split
- [ ] no per-frame allocations (search for `new THREE.` inside `useFrame`)

## Testing
```ts
import ReactThreeTestRenderer from '@react-three/test-renderer'
const r = await ReactThreeTestRenderer.create(<Probe />)
expect(r.scene.findByProps({ name: 'probe' })).toBeTruthy()
```
Pure helpers (`layout.ts`, `colorScale.ts`, `easing.ts`) get ordinary vitest unit tests with exact numbers.

## Pitfalls
- Importing `three` examples (`three/examples/jsm/...`) pulls large code; prefer drei wrappers.
- `OrbitControls` fights your camera animations; disable it during scripted camera moves.
- `<Html>` elements are DOM nodes outside the React tree of your page layout; style them with the same tokens.
- Hot reload can leak WebGL contexts in dev; if "too many contexts" appears, reload the tab.
