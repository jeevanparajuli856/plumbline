import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from '@/a11y/useReducedMotion'
import { useSession } from '@/state/session'
import type { SessionState } from '@/state/types'
import { REVEAL_TOTAL_S, clampDelta, damp, revealPose } from '../easing'
import { probeSitePosition, type Vec3 } from '../layout'
import { pTold, tremorAmplitude, tremorOffset, tremorPhases } from '../motionMath'
import { useSceneTokens } from '../tokens'
import { useAnimationWhile } from '../useAnimating'
import { mergeAll, segment } from './geometry'

/** Tip height above the board while the hand hovers over the told site. */
const HOVER = 0.004
const DAMP_LAMBDA = 12
const SETTLED_M = 1e-5
const DEFAULT_SITE = 2
const TREMOR_SEED = 0x5eed
/** Handle leans up and toward the camera, as a right hand holds it. */
const AXIS = new THREE.Vector3(0.25, 1, 0.45).normalize()
const scratch: Vec3 = [0, 0, 0]

function along(distance: number): Vec3 {
  return [AXIS.x * distance, AXIS.y * distance, AXIS.z * distance]
}

function useProbeGeometry(): THREE.BufferGeometry {
  const t = useSceneTokens()
  const geometry = useMemo(() => {
    const metal = new THREE.Color(t.metal)
    const red = new THREE.Color(t.probe)
    return mergeAll([
      segment([0, 0, 0], along(0.011), 0.00045, metal),
      segment(along(0.011), along(0.0135), 0.0042, red),
      segment(along(0.0135), along(0.07), 0.0032, red),
    ])
  }, [t.metal, t.probe])
  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}

const isSettledPhase = (phase: SessionState['phase']) =>
  phase === 'resolved' || phase === 'unresolved' || phase === 'error'

/** Where the tip rests when no reveal is running. Writes into `out`; never allocates. */
function restTarget(s: SessionState, out: THREE.Vector3): THREE.Vector3 {
  const landed = s.readings[s.readings.length - 1]?.landedSite
  if (isSettledPhase(s.phase) && landed !== undefined) {
    const p = probeSitePosition(landed, scratch)
    return out.set(p[0], p[1], p[2])
  }
  const site = s.aimedSite ?? s.instruction?.site ?? DEFAULT_SITE
  const p = probeSitePosition(site, scratch)
  return out.set(p[0], p[1] + HOVER, p[2])
}

/**
 * Red probe. Trembles toward the told site (0.6 mm x (1 - P(l = told)), seeded), then on
 * `revealing` arcs to the landed site, dips, and hands control back with finishReveal(token).
 * The landed site is read only from `reveal`, never before the phase says so.
 */
export function Probe() {
  const geometry = useProbeGeometry()
  const reduced = useReducedMotion()
  const finishReveal = useSession((s) => s.finishReveal)
  const revealToken = useSession((s) => s.reveal?.token ?? null)
  const tremoring = useSession(
    (s) => s.phase === 'awaiting_reading' && tremorAmplitude(pTold(s.placement, s.aimedSite)) > 0,
  )
  useAnimationWhile(!reduced && (tremoring || revealToken !== null))

  useEffect(() => {
    if (revealToken === null) return
    if (reduced) {
      finishReveal(revealToken)
      return
    }
    const id = window.setTimeout(() => finishReveal(revealToken), REVEAL_TOTAL_S * 1000)
    return () => window.clearTimeout(id)
  }, [revealToken, reduced, finishReveal])

  const reducedRef = useRef(reduced)
  useEffect(() => {
    reducedRef.current = reduced
  }, [reduced])

  const group = useRef<THREE.Group>(null)
  const base = useMemo(() => new THREE.Vector3(), [])
  const target = useMemo(() => new THREE.Vector3(), [])
  const start = useMemo(() => new THREE.Vector3(), [])
  const anim = useRef({ token: -1, elapsed: 0, placed: false })
  const phases = useMemo(() => tremorPhases(TREMOR_SEED), [])

  useFrame((state, rawDelta) => {
    const g = group.current
    if (!g) return
    const s = useSession.getState()
    const now = state.clock.elapsedTime
    const snap = reducedRef.current

    if (s.phase === 'revealing' && s.reveal) {
      if (anim.current.token !== s.reveal.token) {
        anim.current.token = s.reveal.token
        anim.current.elapsed = 0
        start.copy(g.position)
      } else {
        // Frame time, not wall time, so a stalled tab resumes the arc instead of skipping it.
        anim.current.elapsed += clampDelta(rawDelta)
      }
      const end = probeSitePosition(s.reveal.landedSite, scratch)
      const pose = snap ? revealPose(Infinity) : revealPose(anim.current.elapsed)
      const k = Math.min(pose.travel, 1)
      g.position.set(
        start.x + (end[0] - start.x) * pose.travel,
        start.y + (end[1] - start.y) * k + pose.lift - pose.dip,
        start.z + (end[2] - start.z) * pose.travel,
      )
      base.copy(g.position)
      if (!pose.done) state.invalidate()
      return
    }

    restTarget(s, target)
    if (snap || !anim.current.placed) {
      base.copy(target)
      anim.current.placed = true
    } else {
      const dt = clampDelta(rawDelta)
      base.set(
        damp(base.x, target.x, DAMP_LAMBDA, dt),
        damp(base.y, target.y, DAMP_LAMBDA, dt),
        damp(base.z, target.z, DAMP_LAMBDA, dt),
      )
      if (base.distanceTo(target) > SETTLED_M) state.invalidate()
    }
    g.position.copy(base)
    if (s.phase === 'awaiting_reading' && !snap) {
      const amp = tremorAmplitude(pTold(s.placement, s.aimedSite))
      g.position.x += tremorOffset(now, amp, phases[0], phases[1])
      g.position.z += tremorOffset(now, amp, phases[2], phases[3])
    }
  })

  return (
    <group ref={group} name="probe">
      <mesh name="probe-body" geometry={geometry} castShadow>
        <meshStandardMaterial vertexColors roughness={0.4} metalness={0.15} />
      </mesh>
    </group>
  )
}
