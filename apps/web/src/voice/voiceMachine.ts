import type { ListenErrorCode } from './listen'
import { parseReading } from './parseReading'
import { voicePhrases, type VoiceSpec } from './phrases'
import type { SpeechPriority } from './speak'

/**
 * Pure voice-loop reducer. It never touches the browser or the store: it returns effects and
 * runtime.ts performs them. Readings reach the store only through a `submit` effect.
 */
export type VoiceStatus =
  | 'off'
  | 'idle'
  | 'speaking'
  | 'listening'
  | 'parsing'
  | 'confirming'
  | 'submitting'

export interface VoiceState {
  status: VoiceStatus
  /** Speech output is playing; tracked apart from status so the loop returns to the right rest. */
  isSpeaking: boolean
  /** The reading awaiting yes or no while confirming. */
  candidate: number | null
  spec: VoiceSpec | null
}

export type VoiceEvent =
  | { type: 'START'; supported: boolean }
  | { type: 'STOP' }
  | { type: 'TOGGLE_LISTEN' }
  | { type: 'CANCEL' }
  | { type: 'SAY'; text: string; priority: SpeechPriority }
  | { type: 'SPEECH_START' }
  | { type: 'SPEECH_END' }
  | { type: 'AUDIO_END' }
  | { type: 'RESULT'; alternatives: string[]; spec: VoiceSpec }
  | { type: 'LISTEN_ERROR'; code: ListenErrorCode }
  | { type: 'SUBMIT_DONE' }
  | { type: 'SUBMIT_REJECTED' }

/** `speak` is speech only (the announcer already mirrors engine events); `announce` is both. */
export type VoiceEffect =
  | { type: 'speak'; text: string; priority: SpeechPriority }
  | { type: 'announce'; text: string; priority: SpeechPriority }
  | { type: 'cancelSpeech' }
  | { type: 'listen' }
  | { type: 'stopListening' }
  | { type: 'submit'; value: number }
  | { type: 'focusTyped' }
  | { type: 'repeat' }

export interface Transition {
  state: VoiceState
  effects: VoiceEffect[]
}

export const initialVoiceState: VoiceState = {
  status: 'off',
  isSpeaking: false,
  candidate: null,
  spec: null,
}

const YES = new Set(['yes', 'yeah', 'yep', 'yup', 'correct', 'right', 'confirm', 'sure', 'send'])
/** Words allowed beside a yes; anything else makes the answer unclear, and unclear never sends. */
const YES_FILLER = new Set(['please', 'it', 'that', 'thats', 'is', 'its', 'go', 'ahead', 'ok', 'okay'])
const NO = new Set(['no', 'nope', 'nah', 'not', 'dont', 'don', 'never', 'wrong', 'incorrect'])
const COMMANDS: Record<string, 'typeInstead' | 'stop' | 'repeat'> = {
  type: 'typeInstead',
  'type instead': 'typeInstead',
  'type it': 'typeInstead',
  keyboard: 'typeInstead',
  stop: 'stop',
  cancel: 'stop',
  'never mind': 'stop',
  nevermind: 'stop',
  repeat: 'repeat',
  again: 'repeat',
  'say again': 'repeat',
  'repeat that': 'repeat',
}
const MIC_UNUSABLE: readonly ListenErrorCode[] = ['not-allowed', 'service-not-allowed', 'audio-capture']
const LISTENING: readonly VoiceStatus[] = ['listening', 'parsing', 'confirming']

/** Speech only: a live-region cue would be read by the screen reader into the open microphone. */
const LISTENING_CUE: VoiceEffect = { type: 'speak', text: voicePhrases.listening, priority: 'polite' }

const announce = (text: string, priority: SpeechPriority = 'polite'): VoiceEffect => ({
  type: 'announce',
  text,
  priority,
})

function rest(state: VoiceState, effects: VoiceEffect[] = []): Transition {
  return {
    state: { ...state, status: state.isSpeaking ? 'speaking' : 'idle', candidate: null, spec: null },
    effects,
  }
}

function words(transcript: string): string[] {
  return transcript.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean)
}

export function voiceReducer(state: VoiceState, event: VoiceEvent): Transition {
  const same: Transition = { state, effects: [] }
  switch (event.type) {
    case 'START':
      return state.status === 'off' && event.supported ? rest(state) : same
    case 'STOP':
      return state.status === 'off'
        ? same
        : { state: { ...initialVoiceState }, effects: [{ type: 'stopListening' }, { type: 'cancelSpeech' }] }
    case 'SAY': {
      const speak: VoiceEffect = { type: 'speak', text: event.text, priority: event.priority }
      // Engine speech (and the screen reader's copy) must not be heard by an open microphone.
      if (LISTENING.includes(state.status)) return rest(state, [{ type: 'stopListening' }, speak])
      return { state, effects: [speak] }
    }
    case 'SPEECH_START':
      return speechChanged(state, true)
    case 'SPEECH_END':
      return speechChanged(state, false)
    case 'TOGGLE_LISTEN':
      return toggle(state)
    case 'CANCEL':
      if (!LISTENING.includes(state.status)) return same
      return rest(state, [
        { type: 'stopListening' },
        announce(state.status === 'confirming' ? voicePhrases.notSent : voicePhrases.stopped),
      ])
    case 'AUDIO_END':
      return state.status === 'listening' ? { state: { ...state, status: 'parsing' }, effects: [] } : same
    case 'RESULT':
      if (!LISTENING.includes(state.status)) return same
      return onResult(state, event.alternatives, event.spec)
    case 'LISTEN_ERROR':
      return LISTENING.includes(state.status) ? onListenError(state, event.code) : same
    case 'SUBMIT_DONE':
      return state.status === 'submitting' ? rest(state) : same
    case 'SUBMIT_REJECTED':
      return state.status === 'submitting' ? rest(state, [announce(voicePhrases.notAwaiting)]) : same
  }
}

function speechChanged(state: VoiceState, isSpeaking: boolean): Transition {
  const next = { ...state, isSpeaking }
  if (state.status === 'idle' && isSpeaking) return { state: { ...next, status: 'speaking' }, effects: [] }
  if (state.status === 'speaking' && !isSpeaking) return { state: { ...next, status: 'idle' }, effects: [] }
  return { state: next, effects: [] }
}

function toggle(state: VoiceState): Transition {
  switch (state.status) {
    case 'off':
      return { state, effects: [announce(voicePhrases.unsupported), { type: 'focusTyped' }] }
    case 'idle':
      return { state: { ...state, status: 'listening' }, effects: [LISTENING_CUE, { type: 'listen' }] }
    case 'speaking':
      return {
        state: { ...state, status: 'listening' },
        effects: [{ type: 'cancelSpeech' }, LISTENING_CUE, { type: 'listen' }],
      }
    case 'listening':
    case 'parsing':
      return rest(state, [{ type: 'stopListening' }, announce(voicePhrases.stopped)])
    case 'confirming':
      return rest(state, [{ type: 'stopListening' }, announce(voicePhrases.notSent)])
    case 'submitting':
      return { state, effects: [] }
  }
}

function onListenError(state: VoiceState, code: ListenErrorCode): Transition {
  if (code === 'aborted') return rest(state)
  if (state.status === 'confirming') return rest(state, [announce(voicePhrases.notSent)])
  if (MIC_UNUSABLE.includes(code)) {
    return rest(state, [announce(voicePhrases.listenError(code), 'assertive'), { type: 'focusTyped' }])
  }
  return rest(state, [announce(voicePhrases.listenError(code))])
}

function onResult(state: VoiceState, alternatives: string[], spec: VoiceSpec): Transition {
  const top = alternatives[0] ?? ''
  const command = COMMANDS[words(top).join(' ')]
  if (command === 'typeInstead') return rest(state, [{ type: 'focusTyped' }, announce(voicePhrases.typeInstead)])
  if (command === 'stop') return rest(state, [announce(voicePhrases.stopped)])
  if (command === 'repeat') return rest(state, [{ type: 'repeat' }])
  if (state.status === 'confirming' && state.candidate !== null) {
    const hasNumber = alternatives.some((a) => 'value' in parseReading(a, spec))
    const answer = hasNumber ? null : confirmAnswer(top)
    if (answer === 'yes') return submit(state, state.candidate)
    if (answer === 'no') return rest(state, [announce(voicePhrases.notSent)])
  }
  return onReading(state, alternatives, spec)
}

/** Digits are kept as tokens so "3.617 right" can never read as a plain yes. */
function confirmAnswer(transcript: string): 'yes' | 'no' | null {
  const tokens = transcript
    .toLowerCase()
    .replace(/['’]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  if (tokens.some((t) => NO.has(t))) return 'no'
  const isPlainYes = tokens.some((t) => YES.has(t)) && tokens.every((t) => YES.has(t) || YES_FILLER.has(t))
  return isPlainYes ? 'yes' : null
}

function onReading(state: VoiceState, alternatives: string[], spec: VoiceSpec): Transition {
  const parsed = alternatives.map((a) => parseReading(a, spec))
  const values = parsed.flatMap((p) => ('value' in p ? [p.value] : []))
  const first = parsed[0]
  const [candidate] = values
  if (candidate === undefined) {
    const code = first && 'error' in first ? first.error : 'no_number'
    return rest(state, [announce(voicePhrases.parseError(code, spec))])
  }
  const distinct = new Set(values.map((v) => v.toFixed(spec.readingDecimals)))
  const topIsCertain = first !== undefined && 'value' in first && !first.needsConfirm
  if (topIsCertain && distinct.size === 1) return submit(state, candidate)
  return {
    state: { ...state, status: 'confirming', candidate, spec },
    effects: [announce(voicePhrases.heardConfirm(candidate, spec)), { type: 'listen' }],
  }
}

function submit(state: VoiceState, value: number): Transition {
  return {
    state: { ...state, status: 'submitting', candidate: null, spec: null },
    effects: [{ type: 'submit', value }],
  }
}
