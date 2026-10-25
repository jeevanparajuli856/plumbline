import type { FixtureT } from '@/engine/schemas'
import { formatPct, formatReading } from '@/lib/format'
import { DOMAINS } from '@/state/domains'
import { loadFixture } from '@/state/replay'
import { TROPES } from '@/test/copyGuards'
import { STEPS } from './content'
import { stepsCaption, stepsRun } from './stepsRun'

let fx: FixtureT

beforeAll(async () => {
  fx = await loadFixture('worked_example')
})

describe('stepsRun', () => {
  it('reads the instruction, reading and slip from the first recorded step', () => {
    const run = stepsRun(fx)!
    const first = fx.steps[0]!
    expect(run.instruction).toBe(`Touch the red probe to ${fx.catalog.site_labels[first.told_site]}.`)
    expect(run.reading).toBe(formatReading(first.reading, DOMAINS[fx.domain]))
    expect(run.told).toBe(first.told_site)
    expect(run.siteCount).toBe(fx.catalog.site_labels.length)
    expect(first.warning).toBe(true)
    expect(run.likely).toBe(first.placement.indexOf(Math.max(...first.placement)))
    expect(run.likelyLabel).toBe(fx.catalog.site_labels[run.likely!])
  })

  it('names the final diagnosis with its recorded confidence', () => {
    const run = stepsRun(fx)!
    const last = fx.steps.at(-1)!
    expect(last.diagnosis).toBeTruthy()
    expect(run.diagnosis!.p).toBe(last.diagnosis!.confidence)
    expect(run.diagnosis!.pct).toBe(formatPct(last.diagnosis!.confidence))
  })

  it('has no slip when the first reading raised no warning', () => {
    const calm = { ...fx, steps: [{ ...fx.steps[0]!, warning: false }] }
    const run = stepsRun(calm)!
    expect(run.likely).toBeNull()
    expect(stepsCaption(run)).not.toContain('warned')
  })

  it('returns null for a recording with no steps', () => {
    expect(stepsRun({ ...fx, steps: [] })).toBeNull()
  })

  it('labels the caption as a simulated hand', () => {
    expect(stepsCaption(stepsRun(fx)!)).toMatch(/^Example from a recorded run with a simulated hand\./)
  })
})

describe('STEPS copy', () => {
  it('has four steps and none of the banned copy tropes', () => {
    expect(STEPS).toHaveLength(4)
    for (const step of STEPS) {
      for (const [name, re] of TROPES) {
        expect(`${step.name} ${step.sentence}`, name).not.toMatch(re)
      }
    }
  })
})
