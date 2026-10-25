import { describe, expect, it } from 'vitest'
import {
  DEPTH_SITES_CM,
  ROAST_CENTRE,
  ROAST_RADIUS,
  ROAST_RADIUS_CM,
  bandRadii,
  depthPosition,
  depthRadius,
} from './roastLayout'

describe('roastLayout', () => {
  it('uses the six engine depth sites on a 6 cm sphere', () => {
    expect(DEPTH_SITES_CM).toEqual([0.5, 1.5, 2.5, 3.5, 4.5, 5.5])
    expect(ROAST_RADIUS_CM).toBe(6)
  })

  it('maps depth from the surface to scene radius linearly', () => {
    expect(depthRadius(0)).toBeCloseTo(ROAST_RADIUS, 12)
    expect(depthRadius(6)).toBeCloseTo(0, 12)
    expect(depthRadius(3)).toBeCloseTo(ROAST_RADIUS / 2, 12)
  })

  it('places a depth site on the probe axis (+x from the centre) on the cut face', () => {
    const [x, y, z] = depthPosition(1)
    expect(x).toBeCloseTo(ROAST_CENTRE[0] + ROAST_RADIUS * (1 - 1.5 / 6), 12)
    expect(y).toBeCloseTo(ROAST_CENTRE[1], 12)
    expect(z).toBeGreaterThan(ROAST_CENTRE[2])
  })

  it('gives each site a 1 cm band, outermost first', () => {
    expect(bandRadii(0)[0]).toBeCloseTo(ROAST_RADIUS * (5 / 6), 12)
    expect(bandRadii(0)[1]).toBeCloseTo(ROAST_RADIUS, 12)
    expect(bandRadii(5)[0]).toBeCloseTo(0, 12)
    expect(bandRadii(5)[1]).toBeCloseTo(ROAST_RADIUS / 6, 12)
  })
})
