import { describe, expect, it } from 'vitest'
import { CIRCUIT_FRAME, ROAST_FRAME, fitDistance, framedCamera, shouldFly } from './framing'

const SIM = { camera: [0.18, 0.22, 0.28], target: [0, 0, 0] }

describe('framing', () => {
  it('is bound by height on a square view and by width on a wide one', () => {
    const t = Math.tan((35 * Math.PI) / 360)
    expect(fitDistance(35, 1, 0.1, 0.1, 1)).toBeCloseTo(0.05 / t, 12)
    expect(fitDistance(35, 2, 0.4, 0.1, 1)).toBeCloseTo(0.2 / (t * 2), 12)
  })

  it('backs off when the fill fraction shrinks', () => {
    expect(fitDistance(35, 1, 0.1, 0.1, 0.5)).toBeCloseTo(2 * fitDistance(35, 1, 0.1, 0.1, 1), 12)
  })

  it('keeps the SIM_POSE viewing direction', () => {
    const cam = framedCamera({ target: [0, 0, 0], width: 0.1, height: 0.1 }, SIM, 35, 1)
    const len = Math.hypot(...cam)
    const ref = Math.hypot(0.18, 0.22, 0.28)
    expect(cam[0] / len).toBeCloseTo(0.18 / ref, 12)
    expect(cam[1] / len).toBeCloseTo(0.22 / ref, 12)
    expect(cam[2] / len).toBeCloseTo(0.28 / ref, 12)
    expect(len).toBeCloseTo(fitDistance(35, 1, 0.1, 0.1), 12)
  })

  it('uses a frame-specific direction when given', () => {
    const cam = framedCamera(
      { target: [1, 0, 0], width: 0.1, height: 0.1, direction: [0, 0, 2] },
      SIM,
      35,
      1,
    )
    expect(cam[0]).toBeCloseTo(1, 12)
    expect(cam[1]).toBeCloseTo(0, 12)
    expect(cam[2]).toBeCloseTo(fitDistance(35, 1, 0.1, 0.1), 12)
  })

  it('frames the board closer than SIM_POSE in a wide slot', () => {
    const cam = framedCamera(CIRCUIT_FRAME, SIM, 35, 2.2)
    const d = Math.hypot(
      cam[0] - CIRCUIT_FRAME.target[0],
      cam[1] - CIRCUIT_FRAME.target[1],
      cam[2] - CIRCUIT_FRAME.target[2],
    )
    expect(d).toBeLessThan(Math.hypot(0.18, 0.22, 0.28))
  })
})

describe('shouldFly', () => {
  const circuit = { sceneMode: 'sim', frame: CIRCUIT_FRAME } as const
  it('flies when the mode or instrument changes, even after the user orbited', () => {
    expect(shouldFly(circuit, { ...circuit, sceneMode: 'landing' }, true)).toBe(true)
    expect(shouldFly(circuit, { ...circuit, frame: ROAST_FRAME }, true)).toBe(true)
  })

  it('refits on resize only while the user has not orbited', () => {
    expect(shouldFly(circuit, circuit, false)).toBe(true)
    expect(shouldFly(circuit, circuit, true)).toBe(false)
  })
})
