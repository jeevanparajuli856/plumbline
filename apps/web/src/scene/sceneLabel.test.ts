import { describe, expect, it } from 'vitest'
import { sceneLabel, type SceneLabelState } from './sceneLabel'

const sites = ['row 1', 'row 2', 'row 3'].map((label, index) => ({ index, label, spoken: label }))
const base: SceneLabelState = { domain: 'circuit', sites, aimedSite: 2, readings: [] }

describe('sceneLabel', () => {
  it('names the aimed row before any reading', () => {
    expect(sceneLabel(base)).toBe(
      '3D view of the breadboard. Probe aimed at row 3. All information is also in the text channel.',
    )
  })

  it('names the told and landed rows once the last reading has been revealed', () => {
    expect(sceneLabel({ ...base, readings: [{ toldSite: 2, landedSite: 1 }] })).toBe(
      '3D view of the breadboard. Told row 3; the probe landed on row 2. All information is also in the text channel.',
    )
  })

  it('never names a landed row that has not been revealed', () => {
    expect(sceneLabel({ ...base, readings: [{ toldSite: 2 }] })).toContain('Probe aimed at row 3.')
  })

  it('uses the roast wording for the thermometer and copes with no catalog yet', () => {
    const depths = [{ index: 0, label: '3.5 cm', spoken: '3.5 cm' }]
    expect(sceneLabel({ domain: 'thermometer', sites: depths, aimedSite: 0, readings: [] })).toBe(
      '3D cross-section of the simulated roast. Probe aimed at 3.5 cm. All information is also in the text channel.',
    )
    expect(sceneLabel({ ...base, sites: [], aimedSite: null })).toBe(
      '3D view of the breadboard. All information is also in the text channel.',
    )
  })
})
