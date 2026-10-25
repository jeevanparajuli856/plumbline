import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { catalogFromFixture, loadFixture, stepViewFromFixture } from '@/state/replay'
import { ApiClient, probeHealth } from './api'
import type { SessionViewT, StepViewT } from './schemas'

let sessionView: SessionViewT
let stepView: StepViewT

beforeAll(async () => {
  const fx = await loadFixture('worked_example')
  const catalog = catalogFromFixture(fx)
  sessionView = {
    session_id: '1b0c9f2e-1d2a-4c3b-9e8f-0a1b2c3d4e5f',
    domain: 'circuit',
    mode: 'live',
    simulated: false,
    reveal: 'never',
    status: 'continue',
    config: {},
    catalog,
    instruction: {
      site: 2,
      label: 'row 3',
      spoken: 'row 3',
      gain_bits: fx.prior_instruction.gain_bits,
    },
    belief: catalog.hypotheses.map(() => 1 / catalog.hypotheses.length),
    entropy_bits: Math.log2(catalog.hypotheses.length),
    steps: [],
    true_hypothesis: null,
  }
  stepView = { ...stepViewFromFixture(fx, 0), landed_site: null }
})

function respond(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        }),
    ),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('ApiClient', () => {
  it('creates a session with the request it was given and parses the view', async () => {
    respond(201, sessionView)
    const view = await new ApiClient().start({
      domain: 'circuit',
      mode: 'live',
      seed: 1,
      reveal: 'never',
    })
    expect(view.session_id).toBe(sessionView.session_id)
    const [url, init] = vi.mocked(fetch).mock.calls[0]!
    expect(String(url)).toMatch(/\/v1\/sessions$/)
    expect(JSON.parse(String(init?.body))).toEqual({
      domain: 'circuit',
      mode: 'live',
      seed: 1,
      reveal: 'never',
    })
  })

  it('sends an empty body for a simulate step and the reading for a live step', async () => {
    respond(200, stepView)
    const client = new ApiClient()
    await client.step('abc', null)
    await client.step('abc', 3.671)
    const bodies = vi.mocked(fetch).mock.calls.map(([, init]) => JSON.parse(String(init?.body)))
    expect(bodies).toEqual([{}, { reading: 3.671 }])
  })

  it('resets through the reset route', async () => {
    respond(200, sessionView)
    await new ApiClient().reset('abc')
    expect(String(vi.mocked(fetch).mock.calls[0]![0])).toMatch(/\/v1\/sessions\/abc\/reset$/)
  })

  it('turns the engine error envelope into an EngineError with its code and sentence', async () => {
    respond(404, {
      error: { code: 'session_not_found', message: 'That session no longer exists.' },
    })
    await expect(new ApiClient().step('abc', 1)).rejects.toMatchObject({
      code: 'session_not_found',
      message: 'That session no longer exists.',
    })
  })

  it('reports a non-envelope failure with its status', async () => {
    respond(502, { nope: true })
    await expect(new ApiClient().reset('abc')).rejects.toMatchObject({ code: 'api_error' })
  })

  it('reports an unreachable engine when the network fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    )
    await expect(new ApiClient().reset('abc')).rejects.toMatchObject({ code: 'api_unreachable' })
  })

  it('rejects a response that does not match the contract', async () => {
    respond(200, { session_id: 3 })
    await expect(new ApiClient().reset('abc')).rejects.toThrow()
  })
})

describe('probeHealth', () => {
  it('is ok on a 200', async () => {
    respond(200, { status: 'ok', version: '0.1.0' })
    expect(await probeHealth()).toBe('ok')
  })

  it('is waking on a 5xx, while free hosting spins up', async () => {
    respond(503, {})
    expect(await probeHealth()).toBe('waking')
  })

  it('is down on a network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    )
    expect(await probeHealth()).toBe('down')
  })

  it('is waking when the probe times out', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) =>
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError')),
            ),
          ),
      ),
    )
    const result = probeHealth()
    await vi.advanceTimersByTimeAsync(5000)
    expect(await result).toBe('waking')
  })
})

describe('chooseClient', () => {
  it('replays without the network, prefers the parity-gated port, and falls back when the API is asleep', async () => {
    const { chooseClient } = await import('./client')
    expect(chooseClient('replay', 'down', false)).toEqual({ kind: 'replay', reason: 'replay_mode' })
    expect(chooseClient('live', 'down', true)).toEqual({ kind: 'local', reason: 'local_parity' })
    expect(chooseClient('simulate', 'ok', false)).toEqual({ kind: 'api', reason: 'api_ok' })
    expect(chooseClient('live', 'unknown', false)).toEqual({ kind: 'api', reason: 'api_ok' })
    expect(chooseClient('simulate', 'waking', false)).toEqual({ kind: 'replay', reason: 'api_unavailable' })
  })
})
