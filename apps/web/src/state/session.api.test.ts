import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StartRequest } from '@/engine/client'

const calls: Array<{ op: string; arg: unknown }> = []
let evictNextStep = false
let sessionCounter = 0

vi.mock('@/engine/api', async () => {
  const { EngineError } = await import('@/engine/client')
  const { loadFixture, catalogFromFixture, stepViewFromFixture } = await import('./replay')
  const fx = await loadFixture('worked_example')
  const catalog = catalogFromFixture(fx)
  const view = (id: string) => ({
    session_id: id,
    domain: 'circuit' as const,
    mode: 'live' as const,
    simulated: false,
    reveal: 'never' as const,
    status: 'continue' as const,
    config: {},
    catalog,
    instruction: { site: 2, label: 'row 3', spoken: 'row 3', gain_bits: fx.prior_instruction.gain_bits },
    belief: fx.steps[0]!.belief.map(() => 1 / fx.steps[0]!.belief.length),
    entropy_bits: 5,
    steps: [],
    true_hypothesis: null,
  })
  class ApiClient {
    readonly kind = 'api' as const
    stepCount = 0
    async start(req: StartRequest) {
      calls.push({ op: 'start', arg: req })
      sessionCounter += 1
      this.stepCount = 0
      return view(`s${sessionCounter}`)
    }
    async step(id: string, reading: number | null) {
      calls.push({ op: 'step', arg: { id, reading } })
      if (evictNextStep) {
        evictNextStep = false
        throw new EngineError('session_not_found', 'That session no longer exists.')
      }
      const s = stepViewFromFixture(fx, Math.min(this.stepCount, fx.steps.length - 1))
      this.stepCount += 1
      return { ...s, landed_site: null }
    }
    async reset(id: string) {
      calls.push({ op: 'reset', arg: id })
      return view(id)
    }
  }
  return { ApiClient, probeHealth: async () => 'ok' }
})

const { useSession } = await import('./session')

describe('session store against the HTTP API', () => {
  beforeEach(() => {
    calls.length = 0
    evictNextStep = false
    useSession.getState().setApiHealth('ok')
  })

  it('sends the seed and reveal the API requires when creating a live session', async () => {
    await useSession.getState().start({ mode: 'live' })
    const req = calls.find((c) => c.op === 'start')?.arg as StartRequest
    expect(req.mode).toBe('live')
    expect(Number.isInteger(req.seed)).toBe(true)
    expect(req.reveal).toBe('never')
  })

  it('reveals after each step in simulate mode and passes an explicit seed through', async () => {
    await useSession.getState().start({ mode: 'simulate', seed: 7 })
    const req = calls.find((c) => c.op === 'start')?.arg as StartRequest
    expect(req.seed).toBe(7)
    expect(req.reveal).toBe('after_step')
  })

  it('re-creates an evicted live session and replays its readings before the new one', async () => {
    await useSession.getState().start({ mode: 'live' })
    await useSession.getState().submitReading(3.671, 'typed')
    expect(useSession.getState().phase).toBe('awaiting_reading')
    calls.length = 0
    evictNextStep = true
    await useSession.getState().submitReading(0.338, 'typed')
    expect(calls.map((c) => c.op)).toEqual(['step', 'start', 'step', 'step'])
    expect(calls.slice(2).map((c) => (c.arg as { reading: number }).reading)).toEqual([3.671, 0.338])
    const s = useSession.getState()
    expect(s.error).toBeNull()
    expect(s.readings).toHaveLength(2)
    expect(s.sessionId).toBe(`s${sessionCounter}`)
  })
})
