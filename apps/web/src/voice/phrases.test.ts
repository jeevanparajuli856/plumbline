import { afterEach, describe, expect, it } from 'vitest'
import { startAnnouncer } from '@/a11y/announcer'
import { readQueue, resetLiveRegion, subscribeLive } from '@/a11y/liveQueue'
import { DOMAINS } from '@/state/domains'
import { useSession } from '@/state/session'
import { createEventPhraser, voicePhrases, type Utterance } from './phrases'

function finishRevealIfAny() {
  const s = useSession.getState()
  if (s.phase === 'revealing' && s.reveal) s.finishReveal(s.reveal.token)
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
    expect(spoken.some((u) => u.priority === 'assertive' && u.text.startsWith('Warning.'))).toBe(true)
    expect(spoken.at(-1)?.text).toContain('Confidence')
  })

  it('says nothing for a silent replay except accepted readings, like the announcer', async () => {
    const phrase = createEventPhraser(useSession.getState())
    const spoken: Utterance[] = []
    cleanups.push(useSession.subscribe((state) => spoken.push(...phrase(state))))
    await useSession.getState().start({ mode: 'replay', fixture: 'worked_example', silent: true })
    await useSession.getState().replayNext()
    finishRevealIfAny()
    expect(spoken).toEqual([{ text: DOMAINS.circuit.phrases.accepted(3.671), priority: 'polite' }])
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
    expect(spoken).toEqual([])
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
    expect(spoken).toContainEqual({ text: DOMAINS.circuit.phrases.accepted(3.671), priority: 'polite' })
  })
})

describe('voicePhrases', () => {
  const spec = DOMAINS.thermometer

  it('speaks readings with the domain unit and decimals, never a hard-coded unit', () => {
    expect(voicePhrases.heardConfirm(65.6, spec)).toBe('I heard 65.6 degrees Celsius. Say yes to send it, or no.')
    expect(voicePhrases.parseError('wrong_unit', spec)).toContain('degrees Celsius')
    expect(voicePhrases.parseError('out_of_range', spec)).toContain('-10 to 150 degrees Celsius')
  })

  it.each(['empty', 'no_number', 'unrecognized', 'ambiguous', 'wrong_unit', 'out_of_range'] as const)(
    'has a sentence for parse error %s',
    (code) => {
      expect(voicePhrases.parseError(code, spec)).toMatch(/^[A-Z].*\.$/)
    },
  )

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
