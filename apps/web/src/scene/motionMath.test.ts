import { describe, expect, it } from 'vitest'
import {
  DEFAULT_P_SAME,
  MAX_PENDULUM_RAD,
  PENDULUM_PERIOD_S,
  TREMOR_FREQS_HZ,
  TREMOR_REFERENCE_M,
  TREMOR_VISIBLE_M,
  alternateIndex,
  confusionPSame,
  pendulumAmplitude,
  pendulumAngle,
  tremorActive,
  tremorAmplitude,
  tremorOffset,
  tremorPhases,
} from './motionMath'

describe('tremor', () => {
  it('is 0.6 mm under the assumed confusion model and scales with 1 - p_same (ARCHITECTURE 8)', () => {
    expect(TREMOR_REFERENCE_M).toBe(0.0006)
    expect(tremorAmplitude(DEFAULT_P_SAME)).toBeCloseTo(0.0006, 12)
    expect(tremorAmplitude(0.56)).toBeCloseTo(0.0012, 12)
    expect(tremorAmplitude(1)).toBe(0)
    expect(tremorAmplitude(1.2)).toBe(0)
  })

  it('takes p_same from the confusion prior, not from the last reading', () => {
    expect(confusionPSame()).toBe(0.78)
  })

  it('runs only in the circuit, while awaiting a reading, above about one pixel', () => {
    const on = { phase: 'awaiting_reading', domain: 'circuit', amplitude: 0.0006 } as const
    expect(TREMOR_VISIBLE_M).toBe(0.00025)
    expect(tremorActive(on)).toBe(true)
    expect(tremorActive({ ...on, phase: 'revealing' })).toBe(false)
    expect(tremorActive({ ...on, phase: 'resolved' })).toBe(false)
    expect(tremorActive({ ...on, domain: 'thermometer' })).toBe(false)
    expect(tremorActive({ ...on, amplitude: 0.0002 })).toBe(false)
  })

  it('sums sines at 1.3 Hz and 2.1 Hz, never exceeding the amplitude', () => {
    expect(TREMOR_FREQS_HZ).toEqual([1.3, 2.1])
    expect(tremorOffset(0.25, 1, 0, 0)).toBeCloseTo(0.3672860295740686, 12)
    for (let t = 0; t < 5; t += 0.01) {
      expect(Math.abs(tremorOffset(t, 0.0006, 1.1, 2.3))).toBeLessThanOrEqual(0.0006 + 1e-15)
    }
  })

  it('draws the same phases from the same seed', () => {
    expect(tremorPhases(7)).toEqual(tremorPhases(7))
    expect(tremorPhases(7)).not.toEqual(tremorPhases(8))
    for (const p of tremorPhases(7)) {
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThan(2 * Math.PI)
    }
  })
})

describe('pendulum', () => {
  it('maps entropy / max entropy to [0, 18 deg]', () => {
    expect(MAX_PENDULUM_RAD).toBeCloseTo((18 * Math.PI) / 180, 12)
    expect(pendulumAmplitude(5.044, 5.044)).toBeCloseTo(MAX_PENDULUM_RAD, 12)
    expect(pendulumAmplitude(2.522, 5.044)).toBeCloseTo(MAX_PENDULUM_RAD / 2, 12)
    expect(pendulumAmplitude(0, 5.044)).toBe(0)
    expect(pendulumAmplitude(9, 5.044)).toBeCloseTo(MAX_PENDULUM_RAD, 12)
  })

  it('swings at full amplitude when nothing has been measured (no max entropy yet)', () => {
    expect(pendulumAmplitude(0, 0)).toBeCloseTo(MAX_PENDULUM_RAD, 12)
  })

  it('makes exactly one 1 s swing then rests, so it never exceeds 1 Hz', () => {
    expect(PENDULUM_PERIOD_S).toBe(1)
    expect(pendulumAngle(0, MAX_PENDULUM_RAD)).toBe(0)
    expect(pendulumAngle(0.25, MAX_PENDULUM_RAD * 0.5)).toBeCloseTo(0.08835729338221293, 12)
    expect(pendulumAngle(1, MAX_PENDULUM_RAD)).toBe(0)
    expect(pendulumAngle(3, MAX_PENDULUM_RAD)).toBe(0)
  })

  it('alternates between unresolved candidates every 3 s', () => {
    expect(alternateIndex(0, 2)).toBe(0)
    expect(alternateIndex(2999, 2)).toBe(0)
    expect(alternateIndex(3000, 2)).toBe(1)
    expect(alternateIndex(6000, 2)).toBe(0)
    expect(alternateIndex(6000, 1)).toBe(0)
    expect(alternateIndex(6000, 0)).toBe(0)
  })
})
