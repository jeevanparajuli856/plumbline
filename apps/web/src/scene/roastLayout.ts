import type { Vec3 } from './layout'

/**
 * Roast cross-section geometry for the simulated thermometer (docs/ARCHITECTURE.md 5.2):
 * a 6 cm sphere, sliced at z = 0 so the cut face looks at the camera; the probe enters along +x.
 * Drawn at 5 cm scene radius so it frames like the breadboard. Pure: no React, no three.
 */
export const ROAST_RADIUS_CM = 6
export const DEPTH_SITES_CM = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5] as const
const BAND_WIDTH_CM = 1
export const ROAST_RADIUS = 0.05
/** Sits on the bench, which is the underside of the breadboard slab. */
export const ROAST_CENTRE: Vec3 = [0, ROAST_RADIUS - 0.009, 0]
/** Markers float just in front of the cut face to avoid z-fighting. */
const FACE_OFFSET = 0.0006

export function depthRadius(depthCm: number): number {
  return ROAST_RADIUS * (1 - depthCm / ROAST_RADIUS_CM)
}

export function depthPosition(site: number): Vec3 {
  const depth = DEPTH_SITES_CM[site] ?? 0
  return [ROAST_CENTRE[0] + depthRadius(depth), ROAST_CENTRE[1], ROAST_CENTRE[2] + FACE_OFFSET]
}

/** [inner, outer] radius of the 1 cm band a site samples. */
export function bandRadii(site: number): [number, number] {
  const outerDepth = site * BAND_WIDTH_CM
  return [depthRadius(outerDepth + BAND_WIDTH_CM), depthRadius(outerDepth)]
}
