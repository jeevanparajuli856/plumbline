import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useSession } from '@/state/session'
import { colorScale } from '../colorScale'
import { clampDelta, damp } from '../easing'
import { BOARD, HOLE_PITCH, SITE_COUNT, siteX } from '../layout'
import { livePose } from '../livePose'
import { useSceneTokens } from '../tokens'
import { rectFrame } from './geometry'

/** Glow strips sit on the empty f..j half, opposite each row. */
const STRIP_WIDTH = 3.4 * HOLE_PITCH
const STRIP_DEPTH = 5.8 * HOLE_PITCH
const STRIP_Z = 3.5 * HOLE_PITCH
const LIFT = 0.0002
const FADE_LAMBDA = 8
const SETTLED = 1e-3
const MIN_VISIBLE = 0.02
const EDGE_THICKNESS = 0.0004
/** Edge outline, in the 3:1 stroke token; the cyan body alone is 1.2:1 on the light board. */
const STRIP_EDGE = rectFrame(STRIP_WIDTH, STRIP_DEPTH, EDGE_THICKNESS)
/** How far the belief plane rises when the landing explodes the layers. */
export const BELIEF_PLANE_RISE = 0.05

/**
 * Placement posterior as cyan glow, intensity colorScale(p) scaled toward --scene-glow-max.
 * Opaque rather than additive so it still reads on the light theme's pale board, and every
 * visible strip carries an edge in --inferred so even a faint one passes 3:1 against the board.
 * Two instanced draw calls. Holds the previous values while a reveal is running, and uploads
 * instance buffers only on frames where a strip actually changed.
 */
export function BeliefOverlay() {
  const tokens = useSceneTokens()
  const body = useRef<THREE.InstancedMesh>(null)
  const edge = useRef<THREE.InstancedMesh>(null)
  const plane = useRef<THREE.Group>(null)
  const shown = useRef(new Float32Array(SITE_COUNT))
  const target = useRef(new Float32Array(SITE_COUNT))
  const painted = useRef({ values: new Float32Array(SITE_COUNT).fill(Number.NaN), tokens })
  const board = useMemo(() => new THREE.Color(tokens.sceneBoard), [tokens.sceneBoard])
  const glow = useMemo(() => new THREE.Color(tokens.inferredFill), [tokens.inferredFill])
  const scratch = useMemo(() => new THREE.Color(), [])
  const shownMatrix = useMemo(() => new THREE.Matrix4(), [])
  const hiddenMatrix = useMemo(() => new THREE.Matrix4().makeScale(0, 0, 0), [])

  /** Board colour at p = 0, cyan at p = 1, brightened up to --scene-glow-max. */
  const paintStrip = (
    b: THREE.InstancedMesh,
    e: THREE.InstancedMesh,
    i: number,
    intensity: number,
  ) => {
    const matrix =
      intensity > MIN_VISIBLE
        ? shownMatrix.makeTranslation(siteX(i), BOARD.top + LIFT, STRIP_Z)
        : hiddenMatrix
    b.setMatrixAt(i, matrix)
    e.setMatrixAt(i, matrix)
    scratch.copy(board).lerp(glow, intensity)
    b.setColorAt(i, scratch.multiplyScalar(1 + (tokens.glowMax - 1) * intensity))
  }

  useFrame((state, rawDelta) => {
    const b = body.current
    const e = edge.current
    if (plane.current) plane.current.position.y = livePose.explode * BELIEF_PLANE_RISE
    if (!b || !e) return
    const s = useSession.getState()
    if (s.phase !== 'revealing') {
      for (let i = 0; i < SITE_COUNT; i++) target.current[i] = s.placement[i] ?? 0
    }
    const dt = clampDelta(rawDelta)
    const last = painted.current
    let moving = false
    let dirty = last.tokens !== tokens
    for (let i = 0; i < SITE_COUNT; i++) {
      const next = damp(shown.current[i]!, target.current[i]!, FADE_LAMBDA, dt)
      shown.current[i] = Math.abs(next - target.current[i]!) < SETTLED ? target.current[i]! : next
      if (shown.current[i] !== target.current[i]) moving = true
      if (shown.current[i] !== last.values[i]) dirty = true
    }
    if (dirty) {
      for (let i = 0; i < SITE_COUNT; i++) paintStrip(b, e, i, colorScale(shown.current[i]!))
      last.values.set(shown.current)
      last.tokens = tokens
      b.instanceMatrix.needsUpdate = true
      e.instanceMatrix.needsUpdate = true
      if (b.instanceColor) b.instanceColor.needsUpdate = true
    }
    if (moving) state.invalidate()
  })

  return (
    <group ref={plane} name="belief-plane">
      <instancedMesh
        ref={body}
        name="placement-glow"
        args={[undefined, undefined, SITE_COUNT]}
        frustumCulled={false}
      >
        <boxGeometry args={[STRIP_WIDTH, 0.0001, STRIP_DEPTH]} />
        <meshBasicMaterial toneMapped={false} polygonOffset polygonOffsetFactor={-1} />
      </instancedMesh>
      <instancedMesh
        ref={edge}
        name="placement-glow-edge"
        args={[STRIP_EDGE, undefined, SITE_COUNT]}
        frustumCulled={false}
      >
        <meshBasicMaterial color={tokens.inferred} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
