import { CIRCUIT_DRIFT_MAX, CIRCUIT_DRIFT_PERIOD_MS, circuitDrift } from './circuitDrift'

describe('circuitDrift', () => {
  it('starts and ends at the rest pose, and reaches the closer view halfway', () => {
    expect(circuitDrift(0)).toBe(0)
    expect(circuitDrift(CIRCUIT_DRIFT_PERIOD_MS / 2)).toBeCloseTo(CIRCUIT_DRIFT_MAX)
    expect(circuitDrift(CIRCUIT_DRIFT_PERIOD_MS)).toBeCloseTo(0)
  })

  it('stays inside the opening of the move, short of the play pose', () => {
    for (let t = 0; t <= CIRCUIT_DRIFT_PERIOD_MS; t += 500) {
      const value = circuitDrift(t)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(CIRCUIT_DRIFT_MAX)
    }
    expect(CIRCUIT_DRIFT_MAX).toBeLessThan(0.25)
  })

  it('ignores a bad clock', () => {
    expect(circuitDrift(Number.NaN)).toBe(0)
    expect(circuitDrift(1000, 0)).toBe(0)
  })
})
