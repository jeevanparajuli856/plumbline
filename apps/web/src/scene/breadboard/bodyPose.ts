import { terminalPosition, type Part, type Vec3 } from '../layout'

/** Resistor body height and nominal length in meters; bodies ride above the holes. Pure. */
export const BODY_Y = 0.003
export const BODY_LENGTH = 0.0062
/** Room left for the leads to bend down into the holes on a tight span. */
const LEAD_CLEARANCE = 0.0016

export interface BodyPose {
  centre: Vec3
  yaw: number
  length: number
  start: Vec3
  end: Vec3
}

/** Where a two-leg part's body sits: centred between its holes, shortened on tight spans. */
export function bodyPose(part: Part, height = BODY_Y, nominal = BODY_LENGTH): BodyPose {
  const a = terminalPosition(part.a)
  const b = terminalPosition(part.b)
  const dx = b[0] - a[0]
  const dz = b[2] - a[2]
  const span = Math.hypot(dx, dz)
  const length = Math.min(nominal, span - LEAD_CLEARANCE)
  const ux = dx / span
  const uz = dz / span
  const centre: Vec3 = [(a[0] + b[0]) / 2, height, (a[2] + b[2]) / 2]
  const half = length / 2
  return {
    centre,
    yaw: -Math.atan2(dz, dx),
    length,
    start: [centre[0] - ux * half, height, centre[2] - uz * half],
    end: [centre[0] + ux * half, height, centre[2] + uz * half],
  }
}
