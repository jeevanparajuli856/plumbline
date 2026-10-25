import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useSession } from '@/state/session'
import { colorScale } from '../colorScale'
import { clampDelta, damp } from '../easing'
import { BOARD, HOLE_PITCH, SITE_COUNT, siteX } from '../layout'
import { livePose } from '../livePose'
import { useSceneTokens } from '../tokens'

/** Glow strips sit on the empty f..j half, opposite each row. */
const STRIP_WIDTH = 3.4 * HOLE_PITCH
const STRIP_DEPTH = 5.8 * HOLE_PITCH
const STRIP_Z = 3.5 * HOLE_PITCH
const LIFT = 0.0002
const FADE_LAMBDA = 8
const SETTLED = 1e-3
const MIN_VISIBLE = 0.02
/** How far the belief plane rises when the landing explodes the layers. */
export const BELIEF_PLANE_RISE = 0.05

/**
 * Placement posterior as cyan glow, intensity colorScale(p) scaled toward --scene-glow-max.
 * Opaque rather than additive so it still reads on the light theme's pale board.
 * One instanced draw call. Holds the previous values while a reveal is running.
 */
export function BeliefOverlay() {
  const tokens = useSceneTokens()
  const mesh = useRef<THREE.InstancedMesh>(null)
  const plane = useRef<THREE.Group>(null)
  const shown = useRef(new Float32Array(SITE_COUNT))
  const target = useRef(new Float32Array(SITE_COUNT))
  const board = useMemo(() => new THREE.Color(tokens.sceneBoard), [tokens.sceneBoard])
  const glow = useMemo(() => new THREE.Color(tokens.inferredFill), [tokens.inferredFill])
  const scratch = useMemo(() => new THREE.Color(), [])
  const shownMatrix = useMemo(() => new THREE.Matrix4(), [])
  const hiddenMatrix = useMemo(() => new THREE.Matrix4().makeScale(0, 0, 0), [])

  /** Board colour at p = 0, cyan at p = 1, brightened up to --scene-glow-max. */
  const paintStrip = (m: THREE.InstancedMesh, i: number, intensity: number) => {
    const visible = intensity > MIN_VISIBLE
    m.setMatrixAt(
      i,
      visible ? shownMatrix.makeTranslation(siteX(i), BOARD.top + LIFT, STRIP_Z) : hiddenMatrix,
    )
    scratch.copy(board).lerp(glow, intensity)
    m.setColorAt(i, scratch.multiplyScalar(1 + (tokens.glowMax - 1) * intensity))
  }

  useFrame((state, rawDelta) => {
    const m = mesh.current
    if (plane.current) plane.current.position.y = livePose.explode * BELIEF_PLANE_RISE
    if (!m) return
    const s = useSession.getState()
    if (s.phase !== 'revealing') {
      for (let i = 0; i < SITE_COUNT; i++) target.current[i] = s.placement[i] ?? 0
    }
    const dt = clampDelta(rawDelta)
    let moving = false
    for (let i = 0; i < SITE_COUNT; i++) {
      const next = damp(shown.current[i]!, target.current[i]!, FADE_LAMBDA, dt)
      shown.current[i] = Math.abs(next - target.current[i]!) < SETTLED ? target.current[i]! : next
      if (shown.current[i] !== target.current[i]) moving = true
      paintStrip(m, i, colorScale(shown.current[i]!))
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    if (moving) state.invalidate()
  })

  return (
    <group ref={plane} name="belief-plane">
      <instancedMesh
        ref={mesh}
        name="placement-glow"
        args={[undefined, undefined, SITE_COUNT]}
        frustumCulled={false}
      >
        <boxGeometry args={[STRIP_WIDTH, 0.0001, STRIP_DEPTH]} />
        <meshBasicMaterial toneMapped={false} polygonOffset polygonOffsetFactor={-1} />
      </instancedMesh>
    </group>
  )
}
