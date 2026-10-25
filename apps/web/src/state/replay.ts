import { EngineError, type EngineClient, type StartRequest } from '@/engine/client'
import {
  Fixture,
  type CatalogViewT,
  type FixtureT,
  type InstructionViewT,
  type SessionViewT,
  type StepViewT,
} from '@/engine/schemas'
import provisionalWorkedExample from '@/fixtures/provisional/worked_example.json'

export const READING_MATCH_TOLERANCE = 1e-3

const PROVISIONAL: Record<string, unknown> = { worked_example: provisionalWorkedExample }

/** Loads a recorded fixture by id. Provisional hand-typed fixtures are the fallback until the engine records real ones. */
export async function loadFixture(id: string): Promise<FixtureT> {
  const recorded = import.meta.glob('@fixtures/parity/*.json', { import: 'default' })
  const key = Object.keys(recorded).find((path) => path.endsWith(`/${id}.json`))
  const raw = key ? await recorded[key]!() : PROVISIONAL[id]
  if (raw === undefined) throw new EngineError('fixture_missing', `No recording named ${id}.`)
  const parsed = Fixture.safeParse(raw)
  if (!parsed.success) throw new EngineError('fixture_missing', `The recording ${id} is malformed.`)
  return parsed.data
}

function titleFromId(id: string): string {
  return id.replace(/_/g, ' ')
}

export function catalogFromFixture(fx: FixtureT): CatalogViewT {
  return {
    domain: fx.domain,
    simulated: fx.domain === 'thermometer',
    reading_unit: fx.domain === 'circuit' ? 'V' : '°C',
    sigma: typeof fx.config.sigma === 'number' ? fx.config.sigma : 0,
    hypotheses: fx.catalog.hypothesis_ids.map((id, i) => {
      const label = fx.catalog.hypothesis_labels?.[i] ?? titleFromId(id)
      return { id, label, spoken: label, description: label }
    }),
    sites: fx.catalog.site_labels.map((label, index) => ({ index, label, spoken: label })),
    classes: fx.catalog.classes,
    expected_readings: fx.catalog.expected_readings ?? null,
  }
}

function instructionFor(fx: FixtureT, site: number, gainBits: number[]): InstructionViewT {
  const label = fx.catalog.site_labels[site] ?? `site ${site + 1}`
  return { site, label, spoken: label, gain_bits: gainBits }
}

function labelOf(catalog: CatalogViewT, id: string): string {
  return catalog.hypotheses.find((h) => h.id === id)?.label ?? titleFromId(id)
}

export function stepViewFromFixture(fx: FixtureT, index: number): StepViewT {
  const catalog = catalogFromFixture(fx)
  const step = fx.steps[index]
  if (!step) throw new EngineError('session_lost', 'The recording has no more steps.')
  const prior = index === 0 ? fx.prior_instruction : fx.steps[index - 1]!.engine_choice
  const toldGain = prior.site === step.told_site ? prior.gain_bits : step.engine_choice.gain_bits
  const likely = step.placement.indexOf(Math.max(...step.placement))
  const next = fx.steps[index + 1]
  const diagnosis = step.diagnosis
    ? {
        hypothesis_id: step.diagnosis.hypothesis_id,
        label: labelOf(catalog, step.diagnosis.hypothesis_id),
        confidence: step.diagnosis.confidence,
        spoken: labelOf(catalog, step.diagnosis.hypothesis_id),
      }
    : null
  return {
    step_index: step.index,
    instruction: instructionFor(fx, step.told_site, toldGain),
    reading: step.reading,
    unit: catalog.reading_unit,
    landed_site: step.landed_site,
    placement: {
      probs: step.placement,
      warning: {
        active: step.warning,
        p_off_site: step.p_off_site,
        likely_site: likely,
        text: '',
      },
    },
    placement_audit: step.placement_audit.map((probs, i) => ({ step_index: i, probs })),
    belief: step.belief,
    entropy_bits: step.entropy_bits,
    status: step.status,
    diagnosis,
    unresolved: step.unresolved ?? null,
    next_instruction:
      step.status === 'continue' && next
        ? instructionFor(fx, next.told_site, step.engine_choice.gain_bits)
        : null,
    baseline: {
      method: step.baseline.method,
      shadow: true,
      belief: step.baseline.belief,
      diagnosis: {
        hypothesis_id: step.baseline.top,
        label: labelOf(catalog, step.baseline.top),
        confidence: step.baseline.confidence,
        spoken: labelOf(catalog, step.baseline.top),
      },
    },
  }
}

/** Deterministic playback of a recorded session. Never touches the network. */
export class ReplayClient implements EngineClient {
  readonly kind = 'replay' as const
  private fixture: FixtureT | null = null
  private cursor = 0

  get loaded(): FixtureT | null {
    return this.fixture
  }

  async start(req: StartRequest): Promise<SessionViewT> {
    const fx = await loadFixture(req.fixture ?? 'worked_example')
    this.fixture = fx
    this.cursor = 0
    const n = fx.catalog.hypothesis_ids.length
    return {
      session_id: `replay:${fx.name}`,
      domain: fx.domain,
      mode: 'replay',
      simulated: fx.domain === 'thermometer',
      reveal: 'after_step',
      status: 'awaiting_reading',
      config: fx.config,
      catalog: catalogFromFixture(fx),
      instruction: instructionFor(fx, fx.prior_instruction.site, fx.prior_instruction.gain_bits),
      belief: Array.from({ length: n }, () => 1 / n),
      entropy_bits: Math.log2(n),
      steps: [],
      true_hypothesis: null,
    }
  }

  /** The expected reading for the next step, so the UI can offer it. */
  expectedReading(): number | null {
    return this.fixture?.steps[this.cursor]?.reading ?? null
  }

  async step(_sessionId: string, reading: number | null): Promise<StepViewT> {
    if (!this.fixture) throw new EngineError('session_lost', 'No recording is loaded.')
    const expected = this.fixture.steps[this.cursor]
    if (!expected) throw new EngineError('session_lost', 'The recording has ended.')
    if (reading !== null && Math.abs(reading - expected.reading) > READING_MATCH_TOLERANCE) {
      throw new EngineError(
        'not_next_in_replay',
        `The recording expects ${expected.reading} next. Type that, or press Next to let it play.`,
      )
    }
    const view = stepViewFromFixture(this.fixture, this.cursor)
    this.cursor += 1
    return view
  }

  async reset(_sessionId: string): Promise<SessionViewT> {
    if (!this.fixture) throw new EngineError('session_lost', 'No recording is loaded.')
    return this.start({ domain: this.fixture.domain, mode: 'replay', fixture: this.fixture.name })
  }
}
