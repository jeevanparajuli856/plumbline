import type { Vec3 } from './layout'
import { ROAST_CENTRE } from './roastLayout'

/**
 * Sim camera framing. Keeps the viewing direction of SIM_POSE (landing/choreography, frozen)
 * and fits the distance so the instrument fills the slot at its aspect. Pure.
 */
export interface FrameSpec {
  target: Vec3
  /** World extent to keep in view, meters. */
  width: number
  height: number
  /** Viewing direction (target to camera); defaults to SIM_POSE's. */
  direction?: Vec3
}

/** Board, off-board battery on the left and the black lead's cable on the right. */
export const CIRCUIT_FRAME: FrameSpec = { target: [-0.008, 0.012, 0], width: 0.25, height: 0.15 }
/** Cut sphere plus the thermometer shaft and handle along +x. */
export const ROAST_FRAME: FrameSpec = {
  target: [0.045, ROAST_CENTRE[1], 0],
  width: 0.21,
  height: 0.14,
  /** Nearly face-on, so the depth bands on the cut face read as rings, not ellipses. */
  direction: [0.12, 0.3, 1],
}
export const FRAME_FILL = 0.9

/** Distance at which a width x height box fills `fill` of a perspective view. */
export function fitDistance(
  fovDeg: number,
  aspect: number,
  width: number,
  height: number,
  fill = FRAME_FILL,
): number {
  const halfTan = Math.tan((fovDeg * Math.PI) / 360)
  const byHeight = height / 2 / (halfTan * fill)
  const byWidth = width / 2 / (halfTan * Math.max(aspect, 1e-6) * fill)
  return Math.max(byHeight, byWidth)
}

/** Camera position: from the frame target, along the frame's (or reference) direction, fitted. */
export function framedCamera(
  spec: FrameSpec,
  reference: { camera: readonly number[]; target: readonly number[] },
  fovDeg: number,
  aspect: number,
): Vec3 {
  const [dx, dy, dz] = spec.direction ?? [
    (reference.camera[0] ?? 0) - (reference.target[0] ?? 0),
    (reference.camera[1] ?? 0) - (reference.target[1] ?? 0),
    (reference.camera[2] ?? 0) - (reference.target[2] ?? 0),
  ]
  const length = Math.hypot(dx, dy, dz) || 1
  const d = fitDistance(fovDeg, aspect, spec.width, spec.height)
  return [
    spec.target[0] + (dx / length) * d,
    spec.target[1] + (dy / length) * d,
    spec.target[2] + (dz / length) * d,
  ]
}
