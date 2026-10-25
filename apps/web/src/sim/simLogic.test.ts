import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMAINS } from '@/state/domains'
import { useSession } from '@/state/session'
import type { Catalog, ReadingEntry } from '@/state/types'
import {
  HEALTH_GIVE_UP_MS,
  HEALTH_POLL_MS,
  healthSentence,
  initialProbe,
  nextProbeDelay,
  onProbeResult,
  probeOnce,
} from './healthProbe'
import { isRewinding, stepBack } from './replayNav'
import { parseSimParams, THERMOMETER_FIXTURE, withChoice } from './simParams'
import {
  argmax,
  baselineName,
  beliefRows,
  logRows,
  parseReadingInput,
  placementItems,
  placementSentence,
  plumblineVerdict,
  splitFirstSentence,
  uncertaintyFraction,
} from './view'

const catalog: Catalog = {
  domain: 'circuit',
  simulated: false,
  readingUnit: 'V',
  sigma: 0.02,
  hypotheses: ['a', 'b', 'c', 'd', 'e'].map((id) => ({
    id,
    label: `Fault ${id}`,
    spoken: id,
    description: '',
  })),
  sites: [0, 1, 2].map((index) => ({
    index,
    label: `row ${index + 1}`,
    spoken: `row ${index + 1}`,
  })),
  classes: [],
}

describe('parseSimParams', () => {
  const parse = (q: string) => parseSimParams(new URLSearchParams(q))

  it('defaults to a circuit replay with no fixture override', () => {
    expect(parse('')).toEqual({
      mode: 'replay',
      domain: 'circuit',
      fixture: undefined,
      textView: false,
    })
  })

  it('maps demo=worked-example to the worked_example recording in replay mode', () => {
    expect(parse('demo=worked-example&mode=simulate')).toMatchObject({
      mode: 'replay',
      fixture: 'worked_example',
    })
  })

  it('replays the thermometer recording when the thermometer is chosen in replay', () => {
    expect(parse('domain=thermometer')).toMatchObject({
      domain: 'thermometer',
      fixture: THERMOMETER_FIXTURE,
    })
  })

  it('drops fixtures outside replay and rejects malformed values', () => {
    expect(parse('mode=simulate&fixture=seed_1')).toMatchObject({
      mode: 'simulate',
      fixture: undefined,
    })
    expect(parse('mode=bogus&domain=../x&fixture=../../etc')).toEqual({
      mode: 'replay',
      domain: 'circuit',
      fixture: undefined,
      textView: false,
    })
  })

  it('reads view=text as the text-only view', () => {
    expect(parse('view=text').textView).toBe(true)
    expect(parse('view=both').textView).toBe(false)
  })

  it('withChoice keeps unrelated params and drops demo and fixture', () => {
    const next = withChoice(new URLSearchParams('demo=worked-example&present=1'), {
      mode: 'simulate',
    })
    expect(next.get('mode')).toBe('simulate')
    expect(next.get('present')).toBe('1')
    expect(next.has('demo')).toBe(false)
    expect(withChoice(new URLSearchParams('fixture=x'), { domain: 'thermometer' }).toString()).toBe(
      'domain=thermometer',
    )
  })
})

describe('view helpers', () => {
  it('beliefRows returns the top faults by probability with labels', () => {
    const rows = beliefRows([0.1, 0.5, 0.05, 0.3, 0.05], catalog, 3)
    expect(rows.map((r) => r.id)).toEqual(['b', 'd', 'a'])
    expect(rows[0]).toEqual({ id: 'b', label: 'Fault b', p: 0.5 })
  })

  it('argmax picks the first maximum', () => {
    expect(argmax([0.2, 0.7, 0.7])).toBe(1)
    expect(argmax([])).toBe(0)
  })

  it('placementItems marks told, aimed and landed, and likely only once a posterior exists', () => {
    const before = placementItems({
      placement: [0, 0, 0],
      catalog,
      toldSite: 2,
      landedSite: null,
      aimedSite: 2,
    })
    expect(before.some((i) => i.isLikely)).toBe(false)
    expect(before[2]).toMatchObject({ isTold: true, isAimed: true, p: null })
    expect(placementSentence(before[2]!)).toBe('Row 3, told, aimed, no reading yet')
    const after = placementItems({
      placement: [0.1, 0.8, 0.1],
      catalog,
      toldSite: 2,
      landedSite: 1,
      aimedSite: null,
    })
    expect(after[1]).toMatchObject({ isLikely: true, isLanded: true, p: 0.8 })
    expect(placementSentence(after[1]!)).toBe('Row 2, likely, landed, 80%')
    expect(placementSentence(after[0]!)).toBe('Row 1, 10%')
  })

  it('plumblineVerdict names the indistinguishable faults with no single percentage when unresolved', () => {
    const rows = [
      { id: 'LED_open', label: 'LED is open', p: 0.5 },
      { id: 'LED_reversed', label: 'LED is backwards', p: 0.5 },
    ]
    expect(plumblineVerdict(rows, true, ['LED is open', 'LED is backwards'])).toEqual({
      kind: 'unresolved',
      text: 'Unresolved: LED is open or LED is backwards',
    })
    expect(plumblineVerdict(rows, true, null)).toEqual({
      kind: 'top',
      label: 'LED is open',
      p: 0.5,
    })
    expect(plumblineVerdict(rows, false, null)).toEqual({ kind: 'waiting' })
    expect(plumblineVerdict([], true, [])).toEqual({ kind: 'waiting' })
  })

  it('splitFirstSentence separates the command from its follow-up', () => {
    expect(splitFirstSentence('Touch the red probe to row 3. Say or type the reading.')).toEqual([
      'Touch the red probe to row 3.',
      'Say or type the reading.',
    ])
    expect(splitFirstSentence('One sentence')).toEqual(['One sentence', ''])
  })

  it('logRows hides the landed row until it is revealed and names warnings', () => {
    const base: ReadingEntry = {
      step: 0,
      toldSite: 2,
      value: 3.671,
      source: 'replay',
      placement: [0, 1, 0],
      warning: { toldSite: 2, likelySite: 1, pOffSite: 1, text: 'Warning.' },
      entropyBits: 1.161,
      top: [],
      acceptedAt: 1,
    }
    const [hidden] = logRows([base], catalog, DOMAINS.circuit)
    expect(hidden).toMatchObject({
      step: '1',
      told: 'row 3',
      reading: '3.671 V',
      landed: 'hidden',
      hasWarning: true,
    })
    expect(hidden?.warning).toBe('Yes, likely row 2 (100%)')
    const [shown] = logRows([{ ...base, landedSite: 1, warning: null }], catalog, DOMAINS.circuit)
    expect(shown).toMatchObject({ landed: 'row 2', warning: 'No', hasWarning: false })
  })

  it('baselineName always names the published method', () => {
    expect(baselineName('entropy_exact')).toBe('Published method')
    expect(baselineName('something_new')).toBe('Published method')
  })

  it('uncertaintyFraction clamps and handles a zero maximum', () => {
    expect(uncertaintyFraction(1, 4)).toBe(0.25)
    expect(uncertaintyFraction(9, 4)).toBe(1)
    expect(uncertaintyFraction(-1, 4)).toBe(0)
    expect(uncertaintyFraction(0, 0)).toBe(1)
  })
})

describe('parseReadingInput', () => {
  const spec = DOMAINS.circuit

  it('accepts decimals, negatives, leading dots and decimal commas', () => {
    expect(parseReadingInput(' 3.671 ', spec)).toEqual({ ok: true, value: 3.671 })
    expect(parseReadingInput('-0.5', spec)).toEqual({ ok: true, value: -0.5 })
    expect(parseReadingInput('.338', spec)).toEqual({ ok: true, value: 0.338 })
    expect(parseReadingInput('0,338', spec)).toEqual({ ok: true, value: 0.338 })
  })

  it('rejects empty, non-numeric and out-of-range input with a sentence', () => {
    expect(parseReadingInput('', spec)).toEqual({
      ok: false,
      message: 'Type the reading in volts first.',
    })
    const nan = parseReadingInput('three', spec)
    expect(nan.ok).toBe(false)
    expect(parseReadingInput('1e3', spec).ok).toBe(false)
    const far = parseReadingInput('40', spec)
    expect(far).toEqual({
      ok: false,
      message: 'That is outside what this instrument shows, -1 to 12 volts.',
    })
  })
})

describe('health probe state machine', () => {
  it('starts unknown and polling', () => {
    expect(initialProbe(0)).toEqual({ health: 'unknown', startedAt: 0, attempts: 0, polling: true })
  })

  it('stops polling as soon as the engine answers', () => {
    const s = onProbeResult(initialProbe(0), true, 100)
    expect(s).toMatchObject({ health: 'ok', polling: false, attempts: 1 })
    expect(nextProbeDelay(s)).toBeNull()
  })

  it('reads failures as waking and keeps polling inside the give-up window', () => {
    const s = onProbeResult(initialProbe(0), false, HEALTH_GIVE_UP_MS - 1)
    expect(s).toMatchObject({ health: 'waking', polling: true })
    expect(nextProbeDelay(s)).toBe(HEALTH_POLL_MS)
  })

  it('gives up as down after the window', () => {
    const s = onProbeResult(initialProbe(0), false, HEALTH_GIVE_UP_MS)
    expect(s).toMatchObject({ health: 'down', polling: false })
  })

  it('every non-ok sentence says waking up', () => {
    for (const h of ['unknown', 'waking', 'down'] as const)
      expect(healthSentence(h)).toContain('waking up')
    expect(healthSentence('ok')).not.toContain('waking up')
  })
})

describe('probeOnce', () => {
  afterEach(() => vi.useRealTimers())

  it('is true on a 2xx and false on a non-ok answer or a thrown fetch', async () => {
    expect(await probeOnce('u', async () => new Response('{}', { status: 200 }))).toBe(true)
    expect(await probeOnce('u', async () => new Response('', { status: 503 }))).toBe(false)
    expect(await probeOnce('u', async () => Promise.reject(new TypeError('offline')))).toBe(false)
  })

  it('aborts after the timeout', async () => {
    vi.useFakeTimers()
    const hanging: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) =>
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
      )
    const result = probeOnce('u', hanging, 4000)
    await vi.advanceTimersByTimeAsync(4000)
    expect(await result).toBe(false)
  })

  it('aborts when the caller aborts', async () => {
    const outer = new AbortController()
    const hanging: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) =>
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
      )
    const result = probeOnce('u', hanging, 60_000, outer.signal)
    outer.abort()
    expect(await result).toBe(false)
  })
})

describe('stepBack', () => {
  beforeEach(async () => {
    await useSession.getState().start({ mode: 'replay', fixture: 'worked_example' })
  })

  it('does nothing at the first step', async () => {
    expect(await stepBack(useSession)).toBe(false)
  })

  it('ignores a second call while the first is still rewinding', async () => {
    await useSession.getState().replayNext()
    await useSession.getState().replayNext()
    const [first, second] = await Promise.all([stepBack(useSession), stepBack(useSession)])
    expect([first, second]).toEqual([true, false])
    expect(useSession.getState().replay?.stepIndex).toBe(1)
    expect(isRewinding()).toBe(false)
  })

  it('rewinds one recorded step and lands awaiting the next reading', async () => {
    await useSession.getState().replayNext()
    await useSession.getState().replayNext()
    expect(useSession.getState().phase).toBe('resolved')
    expect(await stepBack(useSession)).toBe(true)
    const s = useSession.getState()
    expect(s.replay?.stepIndex).toBe(1)
    expect(s.phase).toBe('awaiting_reading')
    expect(s.readings).toHaveLength(1)
    expect(s.warning).not.toBeNull()
  })
})
