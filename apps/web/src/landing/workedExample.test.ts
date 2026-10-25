import { loadFixture } from '@/state/replay'
import type { FixtureT } from '@/engine/schemas'
import {
  comparisonRows,
  fixtureConfig,
  frameAt,
  isProvisional,
  maxEntropy,
  rank,
  transcript,
  unresolvedGroups,
} from './workedExample'

let fx: FixtureT

beforeAll(async () => {
  fx = await loadFixture('worked_example')
})

describe('transcript', () => {
  it('starts with the uniform prior and the first instruction, read from the fixture', () => {
    const [start] = transcript(fx)
    expect(start!.kind).toBe('start')
    expect(start!.text).toContain(`${fx.catalog.hypothesis_ids.length} possible faults`)
    expect(start!.text).toContain(fx.catalog.site_labels[fx.prior_instruction.site]!)
  })

  it('describes each reading with told row, landed row and value', () => {
    const readings = transcript(fx).filter((t) => t.kind === 'reading')
    expect(readings).toHaveLength(fx.steps.length)
    const s = fx.steps[0]!
    expect(readings[0]!.text).toContain(`Told: touch ${fx.catalog.site_labels[s.told_site]}`)
    expect(readings[0]!.text).toContain(`lands on ${fx.catalog.site_labels[s.landed_site!]}`)
    expect(readings[0]!.text).toContain(s.reading.toFixed(3))
  })

  it('adds one warning per warned step and names the published method next to every belief', () => {
    const items = transcript(fx)
    expect(items.filter((t) => t.kind === 'warning')).toHaveLength(
      fx.steps.filter((s) => s.warning).length,
    )
    for (const t of items.filter((i) => i.kind === 'belief' || i.kind === 'diagnosis')) {
      expect(t.text).toContain('Published method')
    }
    for (const t of items) expect(t.text).not.toContain('—')
  })

  it('has six steps for the worked example', () => {
    expect(transcript(fx)).toHaveLength(6)
  })
})

describe('comparisonRows', () => {
  it('marks which side holds the true fault', () => {
    const rows = comparisonRows(fx)
    expect(rows).toHaveLength(fx.steps.length)
    const last = rows[rows.length - 1]!
    expect(last.plumbline.isTrue).toBe(last.plumbline.id === fx.true_hypothesis)
    expect(last.published.isTrue).toBe(last.published.id === fx.true_hypothesis)
  })
})

describe('frameAt', () => {
  it('shows the instruction and a uniform belief before any reading', () => {
    const f = frameAt(fx, 0)
    expect(f.reading).toBeNull()
    expect(f.landed).toBeNull()
    expect(f.published).toBeNull()
    expect(f.entropyBits).toBeCloseTo(maxEntropy(fx), 9)
    expect(f.toldLabel).toBe(fx.catalog.site_labels[fx.prior_instruction.site])
  })

  it('hides the landed row and the warning until the reading is revealed', () => {
    const hidden = frameAt(fx, 1, false)
    expect(hidden.landed).toBeNull()
    expect(hidden.warning).toBeNull()
    const shown = frameAt(fx, 1, true)
    expect(shown.landed).toBe(fx.steps[0]!.landed_site)
    expect(shown.warning !== null).toBe(fx.steps[0]!.warning)
  })

  it('clamps the reading count and resolves on the last step', () => {
    const f = frameAt(fx, 99)
    expect(f.readingsShown).toBe(fx.steps.length)
    expect(f.isResolved).toBe(fx.steps[fx.steps.length - 1]!.status === 'resolved')
    expect(frameAt(fx, -2).readingsShown).toBe(0)
  })
})

describe('helpers', () => {
  it('ranks by probability, highest first', () => {
    const r = rank(fx, fx.steps[0]!.belief)
    expect(r[0]!.p).toBeGreaterThanOrEqual(r[1]!.p)
  })

  it('reads config numbers and tolerates missing ones', () => {
    const c = fixtureConfig(fx)
    expect(c.sigma).toBe(fx.config.sigma)
    expect(fixtureConfig({ ...fx, config: {} })).toEqual({
      sigma: null,
      pSame: null,
      pPm1: null,
      pPm2: null,
      warningThreshold: null,
      resolveThreshold: null,
    })
  })

  it('treats an unrecorded fixture as provisional', () => {
    expect(isProvisional({ ...fx, provisional: false, generated_by: null })).toBe(true)
    expect(isProvisional({ ...fx, provisional: false, generated_by: 'record_fixtures' })).toBe(
      false,
    )
  })
})

describe('unresolvedGroups', () => {
  it('lists only the classes with more than one fault, with equal shares', () => {
    const groups = unresolvedGroups(fx)
    const expected = fx.catalog.classes.filter((c) => c.length > 1)
    expect(groups.map((g) => g.map((h) => h.id))).toEqual(expected)
    for (const g of groups) for (const h of g) expect(h.p).toBeCloseTo(1 / g.length, 9)
  })
})

describe('engine-shaped fixtures (schema_version 2)', () => {
  it('parses the recorded worked example, with its per-step misfit, and renders every view from it', async () => {
    const { Fixture } = await import('@/engine/schemas')
    const raw = (await import('@fixtures/parity/worked_example.json')).default
    const parsed = Fixture.safeParse(raw)
    expect(parsed.success).toBe(true)
    const recorded = parsed.data!
    expect(recorded.schema_version).toBe(2)
    expect('misfit' in raw.steps[0]!).toBe(true)
    expect(isProvisional(recorded)).toBe(false)
    const items = transcript(recorded)
    expect(items.filter((t) => t.kind === 'reading')).toHaveLength(recorded.steps.length)
    expect(frameAt(recorded, 1).reading).not.toBeNull()
    expect(comparisonRows(recorded)).toHaveLength(recorded.steps.length)
  })
})
