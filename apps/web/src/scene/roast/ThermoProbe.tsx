import { useEffect, useMemo, useRef } from 'react'
import type * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from '@/a11y/useReducedMotion'
import { useSession } from '@/state/session'
import type { SessionState } from '@/state/types'
import { colorScale } from '../colorScale'
import { clampDelta, damp } from '../easing'
import { ROAST_CENTRE, ROAST_RADIUS, depthPosition } from '../roastLayout'
import { toldSite } from '../selectors'
import { useSceneTokens } from '../tokens'

const SHAFT_LENGTH = 0.07
const SHAFT_RADIUS = 0.0011
const HANDLE_LENGTH = 0.03
const HANDLE_RADIUS = 0.0035
const FACE_Z = ROAST_CENTRE[2] + 0.0012
const BAND_WIDTH = ROAST_RADIUS / 6
const SPREAD_HEIGHT = 0.006
const GLOW_HEIGHT = 0.003
const DAMP_LAMBDA = 10
const SETTLED_M = 1e-5
const SITES = [0, 1, 2, 3, 4, 5] as const
const DEPTH_X = SITES.map((i) => depthPosition(i)[0])

/** Depth index the probe tip is drawn at; the landed depth only once the reveal starts. */
function tipSite(s: SessionState): number {
  if (s.phase === 'revealing' && s.reveal) return s.reveal.landedSite
  const landed = s.readings[s.readings.length - 1]?.landedSite
  if ((s.phase === 'resolved' || s.phase === 'unresolved') && landed !== undefined) return landed
  return s.aimedSite ?? toldSite(s) ?? 0
}

/**
 * Axial thermometer probe on the cut face. The told depth +/- 1 band is drawn as a translucent
 * spread (where the tip may really be); per-depth placement glows along the axis.
 */
export function ThermoProbe() {
  const tokens = useSceneTokens()
  const reduced = useReducedMotion()
  const told = useSession(toldSite)
  // Held back during a reveal so the glow never runs ahead of the probe.
  const placement = useSession((s) => (s.phase === 'revealing' ? null : s.placement))
  const probe = useRef<THREE.Group>(null)
  const placed = useRef(false)
  const reducedRef = useRef(reduced)
  useEffect(() => {
    reducedRef.current = reduced
  }, [reduced])

  useFrame((state, rawDelta) => {
    const g = probe.current
    if (!g) return
    const x = DEPTH_X[tipSite(useSession.getState())] ?? DEPTH_X[0]!
    if (reducedRef.current || !placed.current) {
      g.position.x = x
      placed.current = true
      return
    }
    g.position.x = damp(g.position.x, x, DAMP_LAMBDA, clampDelta(rawDelta))
    if (Math.abs(g.position.x - x) > SETTLED_M) state.invalidate()
  })

  const spread = useMemo(() => {
    if (told === null) return null
    const lo = depthPosition(Math.max(0, told - 1))[0]
    const hi = depthPosition(Math.min(5, told + 1))[0]
    return { x: (lo + hi) / 2, width: Math.abs(hi - lo) + BAND_WIDTH }
  }, [told])

  return (
    <group name="thermo-probe">
      <group
        ref={probe}
        name="thermo-probe-tip"
        position={[depthPosition(0)[0], ROAST_CENTRE[1], FACE_Z]}
      >
        <mesh position-x={SHAFT_LENGTH / 2} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[SHAFT_RADIUS, SHAFT_RADIUS * 0.4, SHAFT_LENGTH, 10]} />
          <meshStandardMaterial color={tokens.metal} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position-x={SHAFT_LENGTH + HANDLE_LENGTH / 2} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[HANDLE_RADIUS, HANDLE_RADIUS, HANDLE_LENGTH, 16]} />
          <meshStandardMaterial color={tokens.lead} roughness={0.5} />
        </mesh>
      </group>
      <mesh
        name="depth-spread"
        visible={spread !== null}
        position={[spread?.x ?? 0, ROAST_CENTRE[1], FACE_Z - 0.0004]}
      >
        <planeGeometry args={[spread?.width ?? 0.001, SPREAD_HEIGHT]} />
        <meshBasicMaterial
          color={tokens.inferredFill}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
      {SITES.map((i) => {
        const p = colorScale(placement?.[i] ?? 0)
        return (
          <mesh
            key={i}
            visible={p > 0.02}
            position={[depthPosition(i)[0], ROAST_CENTRE[1] - SPREAD_HEIGHT, FACE_Z]}
          >
            <planeGeometry args={[BAND_WIDTH * 0.9, GLOW_HEIGHT]} />
            <meshBasicMaterial
              color={tokens.inferredFill}
              transparent
              opacity={p}
              toneMapped={false}
            />
          </mesh>
        )
      })}
    </group>
  )
}
