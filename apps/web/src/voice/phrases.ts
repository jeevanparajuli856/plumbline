import { DOMAINS } from '@/state/domains'
import type { DomainSpec, Phase, SessionData } from '@/state/types'
import type { ListenErrorCode } from './listen'
import type { ParseErrorCode } from './parseReading'
import type { SpeechPriority } from './speak'

/**
 * Everything the voice channel says. Engine events are worded only by state/domains.ts and
 * selected exactly as a11y/announcer.ts selects them (phrases.test.ts pins the parity), so
 * spoken and screen-reader text cannot drift. voicePhrases covers the loop's own prompts.
 */
export interface Utterance {
  text: string
  priority: SpeechPriority
}

export type VoiceSpec = Pick<DomainSpec, 'unit' | 'unitSpoken' | 'readingRange' | 'readingDecimals'>

const RETRY = 'Press M to try again, or T to type it.'
const TYPE_INSTEAD = 'Type the reading instead.'

function spokenReading(value: number, spec: VoiceSpec): string {
  return `${value.toFixed(spec.readingDecimals)} ${spec.unitSpoken}`
}

export const voicePhrases = {
  heardConfirm: (value: number, spec: VoiceSpec): string =>
    `I heard ${spokenReading(value, spec)}. Say yes to send it, or no.`,
  parseError(code: ParseErrorCode, spec: VoiceSpec): string {
    const [lo, hi] = spec.readingRange
    switch (code) {
      case 'empty':
      case 'no_number':
        return `I did not catch a number. ${RETRY}`
      case 'unrecognized':
        return `I did not understand that as a reading. ${RETRY}`
      case 'ambiguous':
        return 'I heard more than one number. Say one reading, or press T to type it.'
      case 'wrong_unit':
        return `Say the reading in ${spec.unitSpoken}, or press T to type it.`
      case 'out_of_range':
        return `That is outside what this instrument can show, ${lo} to ${hi} ${spec.unitSpoken}. Check the number.`
    }
  },
  listenError(code: ListenErrorCode): string {
    switch (code) {
      case 'no-speech':
        return `I did not hear anything. ${RETRY}`
      case 'not-allowed':
      case 'service-not-allowed':
        return `The microphone is blocked. ${TYPE_INSTEAD}`
      case 'audio-capture':
        return `No microphone was found. ${TYPE_INSTEAD}`
      case 'network':
        return `Speech recognition could not reach the network. ${TYPE_INSTEAD}`
      case 'unsupported':
        return `This browser cannot listen. ${TYPE_INSTEAD}`
      default:
        return `Speech recognition failed. ${RETRY}`
    }
  },
  unsupported: `This browser cannot listen. ${TYPE_INSTEAD}`,
  listening: 'Listening.',
  stopped: 'Stopped listening.',
  notSent: 'Not sent. Press M to say it again, or T to type it.',
  typeInstead: 'Type the reading and press Enter.',
  notAwaiting: 'Not sent. I am not waiting for a reading right now.',
} as const

/** Returns a stateful mapper: feed it every store state, it returns what to say for that change. */
export function createEventPhraser(initial: SessionData): (state: SessionData) => Utterance[] {
  let lastPhase: Phase = initial.phase
  let lastReadingCount = initial.readings.length
  return (state) => {
    const out: Utterance[] = []
    const say = (text: string, priority: SpeechPriority = 'polite') => out.push({ text, priority })
    const spec = DOMAINS[state.domain]
    const catalog = state.catalog
    // A restart empties the log; count from there so its first reading is spoken.
    if (state.readings.length < lastReadingCount) lastReadingCount = state.readings.length
    if (state.readings.length > lastReadingCount && catalog) {
      lastReadingCount = state.readings.length
      const last = state.readings[state.readings.length - 1]
      if (last) say(spec.phrases.accepted(last.value))
    }
    if (state.phase === lastPhase) return out
    const previous = lastPhase
    lastPhase = state.phase
    if (!catalog || state.replay?.silent) return out
    switch (state.phase) {
      case 'awaiting_reading': {
        if (previous === 'revealing' || previous === 'submitting') {
          if (state.warning) say(state.warning.text, 'assertive')
          else {
            const likely = catalog.sites[argmax(state.placement)]
            if (likely && state.readings.length > 0) say(spec.phrases.likely(likely, Math.max(...state.placement)))
          }
        }
        const site = state.instruction ? catalog.sites[state.instruction.site] : undefined
        if (site) say(spec.phrases.instruction(site))
        break
      }
      case 'resolved': {
        const d = state.diagnosis
        const meta = d ? catalog.hypotheses.find((h) => h.id === d.hypothesisId) : undefined
        if (d && meta) say(spec.phrases.diagnosis(meta, d.confidence))
        break
      }
      case 'unresolved': {
        const ids = state.unresolved?.classes[0] ?? []
        const pair = catalog.hypotheses.filter((h) => ids.includes(h.id))
        say(state.unresolved?.text || spec.phrases.unresolved(pair))
        break
      }
      case 'error':
        if (state.error) say(state.error.sentence, 'assertive')
        break
      default:
        break
    }
    return out
  }
}

function argmax(values: number[]): number {
  let best = 0
  for (let i = 1; i < values.length; i += 1) if ((values[i] ?? 0) > (values[best] ?? 0)) best = i
  return best
}
