/**
 * Landing choreography contract (frozen signature; the landing lane owns the body).
 * The scene's CameraRig reads `useLanding.getState().progress` inside useFrame and damps toward
 * `poseAt(progress)`. Pure function, no React, unit-tested at its keyframes.
 */
export type Vec3 = readonly [number, number, number]

export type SceneKind = 'circuit' | 'roast'

export interface ScenePose {
  /** Camera position and look-at target in meters (board units). */
  camera: Vec3
  target: Vec3
  fov: number
  /** Which instrument is visible; crossfade is driven by `roastMix`. */
  scene: SceneKind
  /** 0 = circuit only, 1 = roast only. */
  roastMix: number
  /** 0 = layers together, 1 = board, hand-confusion and belief planes fully separated in z. */
  explode: number
  /** Index of the math line being explained in `how` (0..5), or -1 for none. */
  mathLine: number
  /** Plumb line opacity; fades into the DOM ladder rail. */
  plumbOpacity: number
}

export const SIM_POSE: ScenePose = {
  camera: [0.18, 0.22, 0.28],
  target: [0, 0, 0],
  fov: 35,
  scene: 'circuit',
  roastMix: 0,
  explode: 0,
  mathLine: -1,
  plumbOpacity: 1,
}

/** Placeholder until the landing lane lands the keyframed version. */
export function poseAt(progress: number): ScenePose {
  void progress
  return SIM_POSE
}
