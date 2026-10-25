import { describe, expect, it } from 'vitest'
import { useSession } from '@/state/session'
import type { Catalog, DomainId, ReadingEntry, SessionState } from '@/state/types'
import { sceneLabel } from './sceneLabel'

const catalogFor = (domain: DomainId, labels: string[]): Catalog => ({
  domain,
  simulated: domain === 'thermometer',
  readingUnit: domain === 'circuit' ? 'V' : 'C',
  sigma: 0.02,
  hypotheses: [],
  sites: labels.map((label, index) => ({ index, label, spoken: label })),
  classes: [],
})
const circuit = catalogFor('circuit', ['row 1', 'row 2', 'row 3', 'row 4', 'row 5', 'row 6'])
const thermometer = catalogFor('thermometer', ['1.5 cm', '2.5 cm', '3.5 cm', '4.5 cm'])

const reading = (over: Partial<ReadingEntry> = {}): ReadingEntry => ({
  step: 0,
  toldSite: 2,
  landedSite: 1,
  value: 3.671,
  source: 'replay',
  placement: [0, 1, 0, 0, 0, 0],
  warning: null,
  entropyBits: 1,
  top: [],
  acceptedAt: 0,
  ...over,
})

const state = (over: Partial<SessionState>): SessionState => ({
  ...useSession.getInitialState(),
  catalog: circuit,
  ...over,
})

describe('sceneLabel', () => {
  it('names the aimed row before any reading', () => {
    expect(sceneLabel(state({ phase: 'awaiting_reading', aimedSite: 2 }))).toBe(
      '3D view of the breadboard. Probe aimed at row 3. All information is also in the text channel.',
    )
  })

  it('falls back to the instructed row when nothing is aimed', () => {
    const instruction = { site: 4, label: 'row 5', spoken: '', gainBits: [] }
    expect(sceneLabel(state({ phase: 'awaiting_reading', aimedSite: null, instruction }))).toBe(
      '3D view of the breadboard. Probe aimed at row 5. All information is also in the text channel.',
    )
  })

  it('names the told and landed rows once the reveal has finished', () => {
    const s = state({ phase: 'awaiting_reading', aimedSite: 3, readings: [reading()] })
    expect(sceneLabel(s)).toBe(
      '3D view of the breadboard. Told row 3; the probe landed on row 2. All information is also in the text channel.',
    )
    expect(sceneLabel({ ...s, phase: 'resolved' })).toBe(sceneLabel(s))
    expect(sceneLabel({ ...s, phase: 'unresolved' })).toBe(sceneLabel(s))
  })

  it('names the told row of the reading in flight, not the next aim the store already holds', () => {
    const s = state({
      phase: 'revealing',
      aimedSite: 0,
      instruction: { site: 0, label: 'row 1', spoken: '', gainBits: [] },
      readings: [reading(), reading({ step: 1, toldSite: 4, landedSite: 4 })],
    })
    expect(sceneLabel(s)).toBe(
      '3D view of the breadboard. Probe aimed at row 5. All information is also in the text channel.',
    )
  })

  it('never names the landed row while the reveal is running', () => {
    const s = state({ phase: 'revealing', aimedSite: 2, readings: [reading()] })
    expect(sceneLabel(s)).not.toContain('landed')
    expect(sceneLabel(s)).not.toContain('row 2')
  })

  it('uses the depth labels for the simulated roast', () => {
    const s = state({ domain: 'thermometer', catalog: thermometer, aimedSite: 2 })
    expect(sceneLabel(s)).toBe(
      '3D cross-section of the simulated roast. Probe aimed at 3.5 cm. All information is also in the text channel.',
    )
  })

  it('says only what the scene is when there is no site yet', () => {
    expect(sceneLabel(state({ phase: 'idle', catalog: null, aimedSite: null }))).toBe(
      '3D view of the breadboard. All information is also in the text channel.',
    )
  })

  it('carries no belief percentages', () => {
    const s = state({ phase: 'resolved', readings: [reading({ placement: [0, 0.97, 0.03, 0, 0, 0] })] })
    expect(sceneLabel(s)).not.toMatch(/%|\d\.\d/)
  })
})
