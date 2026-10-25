import { useEffect, useMemo, useRef, type ComponentRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useReducedMotion } from '@/a11y/useReducedMotion'
import { SIM_POSE, poseAt } from '@/landing/choreography'
import { useLanding } from '@/state/landing'
import { useSession } from '@/state/session'
import { clampDelta, damp } from './easing'
import { CIRCUIT_FRAME, ROAST_FRAME, framedCamera, shouldFly } from './framing'
import { livePose } from './livePose'
import { onViewReset } from './viewControl'

const CAMERA_LAMBDA = 4
const MIX_LAMBDA = 6
const SETTLED_M = 1e-4
const SETTLED_FOV = 0.01
const SETTLED_MIX = 1e-3
const MIN_POLAR = 0.2
/** Stops short of edge-on so the board never flips or hides its rows. */
const MAX_POLAR = 1.3
const MIN_DISTANCE = 0.08
const MAX_DISTANCE = 0.7

function dampTo(current: number, target: number, lambda: number, dt: number, eps: number): number {
  const next = damp(current, target, lambda, dt)
  return Math.abs(next - target) < eps ? target : next
}

interface CameraRigProps {
  /** Off in tests: OrbitControls needs a real DOM element for its listeners. */
  controls?: boolean
}

/**
 * Landing: damps the camera toward poseAt(progress) and writes explode / plumbOpacity /
 * roastMix into livePose. Sim: flies to SIM_POSE's direction, distance fitted to the slot and the
 * instrument (controls disabled while scripted), then hands over to OrbitControls (no pan, polar
 * clamped). Runs before everything else each frame.
 */
export function CameraRig({ controls = true }: CameraRigProps) {
  const sceneMode = useLanding((s) => s.sceneMode)
  const reduced = useReducedMotion()
  const invalidate = useThree((s) => s.invalidate)
  const aspect = useThree((s) => (s.size.height > 0 ? s.size.width / s.size.height : 1))
  const isRoast = useSession((s) => s.domain === 'thermometer')
  const frame = isRoast ? ROAST_FRAME : CIRCUIT_FRAME
  const simCamera = useMemo(
    () => framedCamera(frame, SIM_POSE, SIM_POSE.fov, aspect),
    [frame, aspect],
  )
  const sim = useRef({ camera: simCamera, target: frame.target })
  const orbit = useRef<ComponentRef<typeof OrbitControls>>(null)
  const look = useMemo(() => new THREE.Vector3(...SIM_POSE.target), [])
  const goal = useMemo(() => new THREE.Vector3(), [])
  const goalLook = useMemo(() => new THREE.Vector3(), [])
  const flying = useRef(true)
  const placed = useRef(false)
  /** Set when the user drags the orbit controls; cleared by a new framing or Reset view. */
  const userOrbited = useRef(false)
  const flightKey = useRef({ sceneMode, frame })
  const reducedRef = useRef(reduced)

  useEffect(() => {
    reducedRef.current = reduced
  }, [reduced])
  useEffect(() => useLanding.subscribe(() => invalidate()), [invalidate])
  useEffect(() => {
    sim.current = { camera: simCamera, target: frame.target }
    const next = { sceneMode, frame }
    const fly = shouldFly(flightKey.current, next, userOrbited.current)
    if (flightKey.current.sceneMode !== sceneMode || flightKey.current.frame !== frame) {
      userOrbited.current = false
    }
    flightKey.current = next
    if (!fly) return
    flying.current = true
    invalidate()
  }, [sceneMode, simCamera, frame, invalidate])
  useEffect(
    () =>
      onViewReset(() => {
        userOrbited.current = false
        flying.current = true
        invalidate()
      }),
    [invalidate],
  )

  useFrame((state, rawDelta) => {
    const camera = state.camera
    const landing = useLanding.getState()
    const isLanding = landing.sceneMode === 'landing'
    const pose = isLanding ? poseAt(landing.progress) : SIM_POSE
    // The first frame jumps straight to the pose; later mode changes fly.
    const snap = reducedRef.current || !placed.current
    placed.current = true
    const dt = snap ? Infinity : clampDelta(rawDelta)
    const roastTarget = isLanding
      ? pose.roastMix
      : useSession.getState().domain === 'thermometer'
        ? 1
        : 0
    livePose.roastMix = dampTo(livePose.roastMix, roastTarget, MIX_LAMBDA, dt, SETTLED_MIX)
    livePose.explode = dampTo(
      livePose.explode,
      isLanding ? pose.explode : 0,
      MIX_LAMBDA,
      dt,
      SETTLED_MIX,
    )
    livePose.plumbOpacity = dampTo(
      livePose.plumbOpacity,
      isLanding ? pose.plumbOpacity : 1,
      MIX_LAMBDA,
      dt,
      SETTLED_MIX,
    )
    let moving =
      livePose.roastMix !== roastTarget ||
      livePose.explode !== (isLanding ? pose.explode : 0) ||
      livePose.plumbOpacity !== (isLanding ? pose.plumbOpacity : 1)

    if (isLanding || flying.current) {
      goal.set(...(isLanding ? pose.camera : sim.current.camera))
      goalLook.set(...(isLanding ? pose.target : sim.current.target))
      // The landing poses park the board in the right half of a wide frame. A portrait
      // screen clips that half, so step back and look nearer the board.
      if (isLanding && aspect < 0.8) {
        goalLook.x = pose.target[0] * 0.2
        goalLook.y = pose.target[1] - 0.07
        goal.z *= 1.48
        goal.y *= 1.04
      }
      const k = 1 - Math.exp(-CAMERA_LAMBDA * dt)
      camera.position.lerp(goal, k)
      look.lerp(goalLook, k)
      camera.lookAt(look)
      let fovSettled = true
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = dampTo(camera.fov, pose.fov, CAMERA_LAMBDA, dt, SETTLED_FOV)
        camera.updateProjectionMatrix()
        fovSettled = camera.fov === pose.fov
      }
      const settled =
        fovSettled &&
        camera.position.distanceTo(goal) < SETTLED_M &&
        look.distanceTo(goalLook) < SETTLED_M
      if (orbit.current) {
        orbit.current.target.copy(look)
        orbit.current.enabled = !isLanding && settled
      }
      if (settled && !isLanding) flying.current = false
      if (!settled) moving = true
    }
    if (moving) state.invalidate()
  }, -2)

  if (sceneMode !== 'sim' || !controls) return null
  return (
    <OrbitControls
      ref={orbit}
      makeDefault
      enablePan={false}
      minPolarAngle={MIN_POLAR}
      maxPolarAngle={MAX_POLAR}
      minDistance={MIN_DISTANCE}
      maxDistance={MAX_DISTANCE}
      target={frame.target}
      onStart={() => {
        userOrbited.current = true
      }}
    />
  )
}
