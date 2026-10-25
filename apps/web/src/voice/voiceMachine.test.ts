import { describe, expect, it } from 'vitest'
import { DOMAINS } from '@/state/domains'
import { voicePhrases } from './phrases'
import {
  initialVoiceState,
  voiceReducer,
  type VoiceEffect,
  type VoiceEvent,
  type VoiceState,
  type Transition,
  type VoiceStatus,
} from './voiceMachine'

const spec = DOMAINS.circuit
const result = (...alternatives: string[]): VoiceEvent => ({ type: 'RESULT', alternatives, spec })

function at(status: VoiceStatus, extra: Partial<VoiceState> = {}): VoiceState {
  return {
    ...initialVoiceState,
    status,
    candidate: status === 'confirming' ? 3.671 : null,
    spec: status === 'confirming' ? spec : null,
    ...extra,
  }
}

const kinds = (effects: VoiceEffect[]) => effects.map((e) => e.type)

type Row = [from: VoiceStatus, event: VoiceEvent, to: VoiceStatus, effects: VoiceEffect['type'][]]

const STATUSES: VoiceStatus[] = ['off', 'idle', 'speaking', 'listening', 'parsing', 'confirming', 'submitting']

/** Every status against every event type. Unlisted pairs are asserted to be no-ops below. */
const TABLE: Row[] = [
  ['off', { type: 'START', supported: true }, 'idle', []],
  ['off', { type: 'START', supported: false }, 'off', []],
  ['off', { type: 'TOGGLE_LISTEN' }, 'off', ['announce', 'focusTyped']],
  ['off', { type: 'SAY', text: 'Row 3.', priority: 'polite' }, 'off', ['speak']],

  ['idle', { type: 'TOGGLE_LISTEN' }, 'listening', ['speak', 'listen']],
  ['idle', { type: 'SPEECH_START' }, 'speaking', []],
  ['idle', { type: 'SAY', text: 'Row 3.', priority: 'polite' }, 'idle', ['speak']],
  ['idle', { type: 'STOP' }, 'off', ['stopListening', 'cancelSpeech']],

  ['speaking', { type: 'SPEECH_END' }, 'idle', []],
  ['speaking', { type: 'TOGGLE_LISTEN' }, 'listening', ['cancelSpeech', 'speak', 'listen']],
  ['speaking', { type: 'SAY', text: 'Row 3.', priority: 'polite' }, 'speaking', ['speak']],
  ['speaking', { type: 'STOP' }, 'off', ['stopListening', 'cancelSpeech']],

  ['listening', { type: 'TOGGLE_LISTEN' }, 'idle', ['stopListening', 'announce']],
  ['listening', { type: 'CANCEL' }, 'idle', ['stopListening', 'announce']],
  ['listening', { type: 'AUDIO_END' }, 'parsing', []],
  ['listening', result('3.671'), 'submitting', ['submit']],
  ['listening', { type: 'LISTEN_ERROR', code: 'no-speech' }, 'idle', ['announce']],
  ['listening', { type: 'SAY', text: 'Warning.', priority: 'assertive' }, 'listening', ['speak']],
  ['listening', { type: 'STOP' }, 'off', ['stopListening', 'cancelSpeech']],

  ['parsing', result('3.671'), 'submitting', ['submit']],
  ['parsing', { type: 'CANCEL' }, 'idle', ['stopListening', 'announce']],
  ['parsing', { type: 'TOGGLE_LISTEN' }, 'idle', ['stopListening', 'announce']],
  ['parsing', { type: 'LISTEN_ERROR', code: 'network' }, 'idle', ['announce']],
  ['parsing', { type: 'SAY', text: 'Row 3.', priority: 'polite' }, 'parsing', ['speak']],
  ['parsing', { type: 'STOP' }, 'off', ['stopListening', 'cancelSpeech']],

  ['confirming', result('yes'), 'submitting', ['submit']],
  ['confirming', result('no'), 'idle', ['announce']],
  ['confirming', { type: 'CANCEL' }, 'idle', ['stopListening', 'announce']],
  ['confirming', { type: 'TOGGLE_LISTEN' }, 'idle', ['stopListening', 'announce']],
  ['confirming', { type: 'LISTEN_ERROR', code: 'no-speech' }, 'idle', ['announce']],
  ['confirming', { type: 'SAY', text: 'Row 3.', priority: 'polite' }, 'confirming', ['speak']],
  ['confirming', { type: 'STOP' }, 'off', ['stopListening', 'cancelSpeech']],

  ['submitting', { type: 'SUBMIT_DONE' }, 'idle', []],
  ['submitting', { type: 'SUBMIT_REJECTED' }, 'idle', ['announce']],
  ['submitting', { type: 'SAY', text: 'Row 3.', priority: 'polite' }, 'submitting', ['speak']],
  ['submitting', { type: 'STOP' }, 'off', ['stopListening', 'cancelSpeech']],
]

const ALL_EVENTS: VoiceEvent[] = [
  { type: 'START', supported: true },
  { type: 'STOP' },
  { type: 'TOGGLE_LISTEN' },
  { type: 'CANCEL' },
  { type: 'SAY', text: 'Row 3.', priority: 'polite' },
  { type: 'SPEECH_START' },
  { type: 'SPEECH_END' },
  { type: 'AUDIO_END' },
  result('3.671'),
  { type: 'LISTEN_ERROR', code: 'no-speech' },
  { type: 'SUBMIT_DONE' },
  { type: 'SUBMIT_REJECTED' },
]

describe('voiceMachine transition table', () => {
  it.each(TABLE)('%s + %o -> %s', (from, event, to, effects) => {
    const next = voiceReducer(at(from), event)
    expect(next.state.status).toBe(to)
    expect(kinds(next.effects)).toEqual(effects)
  })

  const listed = new Set(TABLE.map(([from, event]) => `${from}:${event.type}:${JSON.stringify(event)}`))
  const unlisted = STATUSES.flatMap((from) =>
    ALL_EVENTS.filter((event) => !TABLE.some(([f, e]) => f === from && e.type === event.type)).map(
      (event) => [from, event] as const,
    ),
  )

  it('covers every status', () => {
    expect(new Set(TABLE.map(([from]) => from))).toEqual(new Set(STATUSES))
    expect(listed.size).toBe(TABLE.length)
  })

  it.each(unlisted)('%s ignores %o', (from, event) => {
    const before = at(from)
    const next = voiceReducer(before, event)
    const speechOnly = event.type === 'SPEECH_START' || event.type === 'SPEECH_END'
    expect(next.state.status).toBe(from)
    if (!speechOnly) expect(next.state).toEqual(before)
    expect(next.effects).toEqual([])
  })
})

describe('voiceMachine reading results', () => {
  it('submits without asking when the alternatives agree', () => {
    const next = voiceReducer(at('listening'), result('three point six seven one', '3.671', '3.671 volts'))
    expect(next.effects).toEqual([{ type: 'submit', value: 3.671 }])
  })

  it('asks for confirmation when the alternatives disagree, then listens for the answer', () => {
    const next = voiceReducer(at('listening'), result('3.671', '3.67'))
    expect(next.state).toMatchObject({ status: 'confirming', candidate: 3.671 })
    expect(next.effects).toEqual([
      { type: 'announce', text: voicePhrases.heardConfirm(3.671, spec), priority: 'polite' },
      { type: 'listen' },
    ])
  })

  it('asks for confirmation when only a lower alternative parses', () => {
    const next = voiceReducer(at('listening'), result('banana', 'zero point three three eight'))
    expect(next.state).toMatchObject({ status: 'confirming', candidate: 0.338 })
  })

  it.each([
    ['one two', 12],
    ['zero five', 5],
    ['oh five', 5],
    ['one zero', 10],
  ])('never submits a digit run like %j without a yes', (phrase, value) => {
    const next = voiceReducer(at('listening'), result(phrase))
    expect(next.state).toMatchObject({ status: 'confirming', candidate: value })
    expect(kinds(next.effects)).toEqual(['announce', 'listen'])
  })

  it('refuses with the reason when nothing parses', () => {
    const next = voiceReducer(at('listening'), result('fifty volts'))
    expect(next.state.status).toBe('idle')
    expect(next.effects).toEqual([
      { type: 'announce', text: voicePhrases.parseError('out_of_range', spec), priority: 'polite' },
    ])
  })

  it('treats an empty result as no number', () => {
    const next = voiceReducer(at('listening'), result())
    expect(next.effects).toEqual([
      { type: 'announce', text: voicePhrases.parseError('no_number', spec), priority: 'polite' },
    ])
  })

  it('submits the candidate on yes and clears it', () => {
    const next = voiceReducer(at('confirming'), result('yeah that is right'))
    expect(next.effects).toEqual([{ type: 'submit', value: 3.671 }])
    expect(next.state.candidate).toBeNull()
  })

  it('treats a new number while confirming as a fresh reading', () => {
    const next = voiceReducer(at('confirming'), result('0.338'))
    expect(next.effects).toEqual([{ type: 'submit', value: 0.338 }])
  })

  it('returns to speaking, not idle, when speech is still playing', () => {
    const listening = voiceReducer(at('idle'), { type: 'SPEECH_START' }).state
    const opened = { ...listening, status: 'listening' as const }
    expect(voiceReducer(opened, result('3.671')).state.status).toBe('submitting')
    expect(voiceReducer(opened, { type: 'CANCEL' }).state.status).toBe('speaking')
  })
})

describe('voiceMachine confirmation answers', () => {
  const submits = (t: Transition) => t.effects.filter((e) => e.type === 'submit')

  it.each(['yes', 'yes please', 'yeah send it', 'correct', 'yep that is right'])('%j sends the candidate', (phrase) => {
    expect(submits(voiceReducer(at('confirming'), result(phrase)))).toEqual([{ type: 'submit', value: 3.671 }])
  })

  it.each(['no', "that's not right", "don't send it", 'not right', 'never', 'wrong', 'no thats wrong'])(
    '%j does not send and says so',
    (phrase) => {
      const next = voiceReducer(at('confirming'), result(phrase))
      expect(submits(next)).toEqual([])
      expect(next.state.status).toBe('idle')
      expect(next.effects).toEqual([{ type: 'announce', text: voicePhrases.notSent, priority: 'polite' }])
    },
  )

  it('never sends the old candidate when the answer also carries a number', () => {
    const next = voiceReducer(at('confirming'), result('3.617 right'))
    expect(submits(next)).toEqual([])
    expect(next.state.candidate).toBeNull()
  })

  it('treats a bare number as a fresh reading even if a lower alternative says yes', () => {
    expect(submits(voiceReducer(at('confirming'), result('3.617', 'yes')))).toEqual([{ type: 'submit', value: 3.617 }])
  })

  it('does not take an answer with unknown words as yes', () => {
    expect(submits(voiceReducer(at('confirming'), result('yes but row two')))).toEqual([])
  })
})

describe('voiceMachine listening cues', () => {
  it('speaks a short cue before the microphone opens, speech only so the live region stays quiet', () => {
    expect(voiceReducer(at('idle'), { type: 'TOGGLE_LISTEN' }).effects).toEqual([
      { type: 'speak', text: voicePhrases.listening, priority: 'polite' },
      { type: 'listen' },
    ])
  })

  it('says it stopped when the microphone key closes the microphone', () => {
    expect(voiceReducer(at('listening'), { type: 'TOGGLE_LISTEN' }).effects).toEqual([
      { type: 'stopListening' },
      { type: 'announce', text: voicePhrases.stopped, priority: 'polite' },
    ])
  })
})

describe('voiceMachine commands', () => {
  it.each([
    ['type instead', ['focusTyped', 'announce']],
    ['stop', ['announce']],
    ['never mind', ['announce']],
    ['repeat', ['repeat']],
    ['say again', ['repeat']],
  ])('%j from listening goes idle with %o', (phrase, effects) => {
    const next = voiceReducer(at('listening'), result(phrase))
    expect(next.state.status).toBe('idle')
    expect(kinds(next.effects)).toEqual(effects)
  })
})

describe('voiceMachine recognition errors', () => {
  it('stays silent when listening was aborted on purpose', () => {
    expect(voiceReducer(at('listening'), { type: 'LISTEN_ERROR', code: 'aborted' }).effects).toEqual([])
  })

  it.each(['not-allowed', 'service-not-allowed', 'audio-capture'] as const)(
    'moves focus to typed input when the microphone is unusable (%s)',
    (code) => {
      const next = voiceReducer(at('listening'), { type: 'LISTEN_ERROR', code })
      expect(next.effects).toEqual([
        { type: 'announce', text: voicePhrases.listenError(code), priority: 'assertive' },
        { type: 'focusTyped' },
      ])
    },
  )
})
