import { describe, expect, it } from 'vitest'
import { colorScale, glowIntensity, mixRgb } from './colorScale'

describe('colorScale', () => {
  it('maps probability to perceptual intensity with a square root', () => {
    expect(colorScale(0)).toBe(0)
    expect(colorScale(0.25)).toBeCloseTo(0.5, 12)
    expect(colorScale(1)).toBe(1)
  })

  it('clamps out-of-range and non-finite input', () => {
    expect(colorScale(-0.2)).toBe(0)
    expect(colorScale(1.7)).toBe(1)
    expect(colorScale(Number.NaN)).toBe(0)
  })

  it('scales by the theme glow ceiling', () => {
    expect(glowIntensity(0.25, 1.6)).toBeCloseTo(0.8, 12)
    expect(glowIntensity(1, 1.2)).toBeCloseTo(1.2, 12)
  })

  it('mixes two rgb triples linearly', () => {
    expect(mixRgb([0, 0, 0], [1, 0.5, 0.25], 0.5)).toEqual([0.5, 0.25, 0.125])
    expect(mixRgb([1, 1, 1], [0, 0, 0], 2)).toEqual([0, 0, 0])
  })
})
