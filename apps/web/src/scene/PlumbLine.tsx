import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useShallow } from 'zustand/react/shallow'
import { useReducedMotion } from '@/a11y/useReducedMotion'
import { useSession } from '@/state/session'
import { clampDelta, damp } from './easing'
import { ROW_FRAME, partCenter, type PartId } from './layout'
import { livePose } from './livePose'
import { ALTERNATE_PERIOD_MS, pendulumAmplitude, pendulumAngle } from './motionMath'
import { plumbCandidates } from './selectors'
import { useSceneTokens } from './tokens'

export const PIVOT_HEIGHT = 0.06
/** Bob tip ends about 13 mm above the board, clear of the LED dome. */
const LINE_LENGTH = 0.04
const LINE_RADIUS = 0.00022
const BOB_HEIGHT = 0.0065
const BOB_RADIUS = 0.0022
const PIVOT_RADIUS = 0.0012
const TRAVEL_LAMBDA = 4
const SETTLED_M = 1e-5
const REST = [0, 0, ROW_FRAME.centreZ] as const

type Point = readonly [number, number, number]

/** Rest points to cycle through; one averaged point under reduced motion. */
function restPoints(candidates: readonly PartId[], average: boolean): Point[] {
  if (candidates.length === 0) return [REST]
  const pts = candidates.map(partCenter)
  if (!average || pts.length === 1) return pts
  const n = pts.length
  return [[pts.reduce((s, p) => s + p[0], 0) / n, 0, pts.reduce((s, p) => s + p[2], 0) / n]]
}

/**
 * Pendulum over the board. Each change in belief entropy starts one damped swing whose
 * amplitude is entropy / max entropy mapped to [0, 18 deg]; it rests over the diagnosed part and
 * alternates between the two candidates every 3 s when unresolved. Reduced motion: no swing.
 */
export function PlumbLine() {
  const tokens = useSceneTokens()
  const reduced = useReducedMotion()
  const invalidate = useThree((s) => s.invalidate)
  const entropy = useSession((s) => s.entropyBits)
  const maxEntropy = useSession((s) => s.maxEntropyBits)
  const candidates = useSession(useShallow(plumbCandidates))

  const pivot = useRef<THREE.Group>(null)
  const swing = useRef<THREE.Group>(null)
  const pivotMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const lineMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const bobMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const swingState = useRef({ pending: true, t0: 0, amplitude: 0 })
  const alternate = useRef(0)
  const placed = useRef(false)
  const reducedRef = useRef(reduced)
  const rests = useRef<Point[]>([REST])

  useEffect(() => {
    reducedRef.current = reduced
  }, [reduced])

  useEffect(() => {
    swingState.current = { pending: true, t0: 0, amplitude: pendulumAmplitude(entropy, maxEntropy) }
    invalidate()
  }, [entropy, maxEntropy, invalidate])

  useEffect(() => {
    rests.current = restPoints(candidates, reduced)
    alternate.current = 0
    invalidate()
    if (reduced || candidates.length < 2) return
    const id = window.setInterval(() => {
      alternate.current = (alternate.current + 1) % candidates.length
      invalidate()
    }, ALTERNATE_PERIOD_MS)
    return () => window.clearInterval(id)
  }, [candidates, reduced, invalidate])

  const target = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, rawDelta) => {
    const p = pivot.current
    const sw = swing.current
    if (!p || !sw) return
    const snap = reducedRef.current
    const rest = rests.current[alternate.current % rests.current.length] ?? REST
    target.set(rest[0], PIVOT_HEIGHT, rest[2])
    if (snap || !placed.current) {
      p.position.copy(target)
      placed.current = true
    } else {
      const dt = clampDelta(rawDelta)
      p.position.x = damp(p.position.x, target.x, TRAVEL_LAMBDA, dt)
      p.position.z = damp(p.position.z, target.z, TRAVEL_LAMBDA, dt)
      p.position.y = target.y
      if (p.position.distanceTo(target) > SETTLED_M) state.invalidate()
    }

    const sws = swingState.current
    if (sws.pending) {
      sws.pending = false
      sws.t0 = state.clock.elapsedTime
    }
    const t = state.clock.elapsedTime - sws.t0
    sw.rotation.z = snap ? 0 : pendulumAngle(t, sws.amplitude)
    if (!snap && sw.rotation.z !== 0) state.invalidate()

    // The plumb line belongs to the board; it fades out with it when the roast takes over.
    const opacity = livePose.plumbOpacity * (1 - livePose.roastMix)
    p.visible = opacity > 0.01
    if (pivotMaterial.current) pivotMaterial.current.opacity = opacity
    if (lineMaterial.current) lineMaterial.current.opacity = opacity
    if (bobMaterial.current) bobMaterial.current.opacity = opacity
  })

  return (
    <group ref={pivot} name="plumb-line">
      <mesh name="plumb-pivot">
        <sphereGeometry args={[PIVOT_RADIUS, 12, 8]} />
        <meshBasicMaterial ref={pivotMaterial} color={tokens.text} transparent />
      </mesh>
      <group ref={swing}>
        <mesh position-y={-LINE_LENGTH / 2}>
          <cylinderGeometry args={[LINE_RADIUS, LINE_RADIUS, LINE_LENGTH, 6]} />
          <meshBasicMaterial ref={lineMaterial} color={tokens.text} transparent />
        </mesh>
        <mesh name="plumb-bob" position-y={-LINE_LENGTH - BOB_HEIGHT / 2} rotation-x={Math.PI}>
          <coneGeometry args={[BOB_RADIUS, BOB_HEIGHT, 16]} />
          <meshBasicMaterial ref={bobMaterial} color={tokens.inferred} transparent />
        </mesh>
      </group>
    </group>
  )
}
