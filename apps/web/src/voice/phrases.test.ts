import { afterEach, describe, expect, it, vi } from 'vitest'
import { startAnnouncer } from '@/a11y/announcer'
import { readQueue, resetLiveRegion, subscribeLive } from '@/a11y/liveQueue'
import { DOMAINS } from '@/state/domains'
import { useSession } from '@/state/session'
import { createEventPhraser, voicePhrases, type Utterance } from './phrases'

function finishRevealIfAny() {
  const s = useSession.getState()
  if (s.phase === 'revealing' && s.reveal) s.finishReveal(s.reveal.token)
}

/** No thermometer recording exists yet, so an instrument switch is placed in the store directly. */
function switchToThermometer(): string {
  const s = useSession.getState()
  if (!s.catalog) throw new Error('no catalog')
  const site = { index: 0, label: 'depth 1', spoken: 'depth one' }
  useSession.setState({
    domain: 'thermometer',
    sessionId: 'thermometer-test',
    readings: [],
    phase: 'awaiting_reading',
    replay: null,
    catalog: { ...s.catalog, domain: 'thermometer', readingUnit: '°C', sites: [site] },
    instruction: { site: 0, label: 'depth 1', spoken: 'depth one', gainBits: [0] },
  })
  return DOMAINS.thermometer.phrases.instruction(site)
}

const cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn())
  resetLiveRegion()
})

describe('createEventPhraser', () => {
  it('says exactly what the announcer mirrors across the worked example, an error and a retry', async () => {
    const announced: Utterance[] = []
    const spoken: Utterance[] = []
    cleanups.push(
      subscribeLive(() => {
        const last = readQueue().last
        if (last) announced.push({ text: last.text, priority: last.priority })
      }),
    )
    cleanups.push(startAnnouncer())
    const phrase = createEventPhraser(useSession.getState())
    cleanups.push(useSession.subscribe((state) => spoken.push(...phrase(state))))

    await useSession.getState().start({ mode: 'replay', fixture: 'worked_example' })
    await useSession.getState().submitReading(1.0, 'typed')
    await useSession.getState().retry()
    await useSession.getState().replayNext()
    finishRevealIfAny()
    await useSession.getState().replayNext()
    finishRevealIfAny()

    expect(useSession.getState().phase).toBe('resolved')
    expect(spoken).toEqual(announced)
    expect(spoken.some((u) => u.priority === 'assertive' && u.text.startsWith('Warning.'))).toBe(
      true,
    )
    expect(spoken.at(-1)?.text).toContain('Confidence')
  })

  it('matches the announcer across a reset taken while awaiting and an instrument switch', async () => {
    const announced: Utterance[] = []
    const spoken: Utterance[] = []
    cleanups.push(
      subscribeLive(() => {
        const last = readQueue().last
        if (last) announced.push({ text: last.text, priority: last.priority })
      }),
    )
    await useSession.getState().start({ mode: 'replay', fixture: 'worked_example' })
    cleanups.push(startAnnouncer())
    const phrase = createEventPhraser(useSession.getState())
    cleanups.push(useSession.subscribe((state) => spoken.push(...phrase(state))))

    await useSession.getState().replayNext()
    finishRevealIfAny()
    const beforeReset = spoken.length
    await useSession.getState().reset()
    expect(useSession.getState().phase).toBe('awaiting_reading')
    expect(spoken.slice(beforeReset).map((u) => u.text)).toEqual([
      expect.stringMatching(/^Touch the red probe to/),
    ])
    await useSession.getState().replayNext()
    finishRevealIfAny()
    const thermometerInstruction = switchToThermometer()

    expect(spoken).toEqual(announced)
    expect(spoken.at(-1)).toEqual({ text: thermometerInstruction, priority: 'polite' })
    expect(spoken.filter((u) => u.text === DOMAINS.circuit.phrases.accepted(3.671))).toHaveLength(2)
  })

  it('reports fresh starts, including silent ones that say nothing', async () => {
    await useSession.getState().start({ mode: 'replay', fixture: 'worked_example' })
    const onFreshStart = vi.fn()
    const phrase = createEventPhraser(useSession.getState(), { onFreshStart })
    const spoken: Utterance[] = []
    cleanups.push(useSession.subscribe((state) => spoken.push(...phrase(state))))
    await useSession.getState().replayNext()
    finishRevealIfAny()
    spoken.length = 0
    await useSession.getState().start({ mode: 'replay', fixture: 'worked_example', silent: true })
    expect(onFreshStart).toHaveBeenCalled()
    expect(spoken).toEqual([])
  })

  it('says nothing at all during a silent replay, like the announcer', async () => {
    const phrase = createEventPhraser(useSession.getState())
    const spoken: Utterance[] = []
    cleanups.push(useSession.subscribe((state) => spoken.push(...phrase(state))))
    await useSession.getState().start({ mode: 'replay', fixture: 'worked_example', silent: true })
    await useSession.getState().replayNext()
    finishRevealIfAny()
    expect(spoken).toEqual([])
  })

  it('matches the announcer for a user aim and a silent rewind that speaks once', async () => {
    const announced: Utterance[] = []
    const spoken: Utterance[] = []
    cleanups.push(
      subscribeLive(() => {
        const last = readQueue().last
        if (last) announced.push({ text: last.text, priority: last.priority })
      }),
    )
    await useSession.getState().start({ mode: 'replay', fixture: 'worked_example' })
    cleanups.push(startAnnouncer())
    const phrase = createEventPhraser(useSession.getState())
    cleanups.push(useSession.subscribe((state) => spoken.push(...phrase(state))))

    useSession.getState().aimProbe(1)
    await useSession.getState().replayNext()
    finishRevealIfAny()
    await useSession.getState().replayNext()
    finishRevealIfAny()
    const beforeRewind = spoken.length
    await useSession.getState().replayPrevious()

    expect(spoken).toEqual(announced)
    expect(spoken).toContainEqual({ text: 'Aiming at row 2.', priority: 'polite' })
    expect(spoken.slice(beforeRewind)).toHaveLength(1)
    expect(spoken.at(-1)?.priority).toBe('assertive')
    expect(spoken.at(-1)?.text).toMatch(/^Warning\..*Touch the red probe to row 3/)
  })
})

describe('createEventPhraser reading count', () => {
  it('does not re-speak a reading that existed before the phraser started', async () => {
    await useSession.getState().start({ mode: 'replay', fixture: 'worked_example' })
    await useSession.getState().replayNext()
    finishRevealIfAny()
    const phrase = createEventPhraser(useSession.getState())
    const spoken: Utterance[] = []
    cleanups.push(useSession.subscribe((state) => spoken.push(...phrase(state))))
    useSession.getState().aimProbe(0)
    // The aim is spoken; the earlier accepted reading is not repeated.
    expect(spoken).toEqual([{ text: 'Aiming at row 1.', priority: 'polite' }])
  })

  it('speaks the first accepted reading after a session restart', async () => {
    const phrase = createEventPhraser(useSession.getState())
    const spoken: Utterance[] = []
    cleanups.push(useSession.subscribe((state) => spoken.push(...phrase(state))))
    await useSession.getState().start({ mode: 'replay', fixture: 'worked_example' })
    await useSession.getState().replayNext()
    finishRevealIfAny()
    await useSession.getState().replayNext()
    finishRevealIfAny()
    spoken.length = 0
    await useSession.getState().start({ mode: 'replay', fixture: 'worked_example' })
    await useSession.getState().replayNext()
    expect(spoken).toContainEqual({
      text: DOMAINS.circuit.phrases.accepted(3.671),
      priority: 'polite',
    })
  })
})

describe('voicePhrases', () => {
  const spec = DOMAINS.thermometer

  it('speaks readings with the domain unit and decimals, never a hard-coded unit', () => {
    expect(voicePhrases.heardConfirm(65.6, spec)).toBe(
      'I heard 65.6 degrees Celsius. Say yes to send it, or no.',
    )
    expect(voicePhrases.parseError('wrong_unit', spec)).toContain('degrees Celsius')
    expect(voicePhrases.parseError('out_of_range', spec)).toContain('-10 to 150 degrees Celsius')
  })

  it.each([
    'empty',
    'no_number',
    'unrecognized',
    'ambiguous',
    'wrong_unit',
    'out_of_range',
  ] as const)('has a sentence for parse error %s', (code) => {
    expect(voicePhrases.parseError(code, spec)).toMatch(/^[A-Z].*\.$/)
  })

  it.each([
    'no-speech',
    'aborted',
    'not-allowed',
    'service-not-allowed',
    'audio-capture',
    'network',
    'language-not-supported',
    'unsupported',
    'other',
  ] as const)('has a sentence for listen error %s', (code) => {
    expect(voicePhrases.listenError(code)).toMatch(/^[A-Z].*\.$/)
  })
})
