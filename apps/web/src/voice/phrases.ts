import type { DomainSpec } from '@/state/types'
import type { ListenErrorCode } from './listen'
import type { ParseErrorCode } from './parseReading'

/**
 * Engine-event wording lives in state/domains.ts and is spoken from there (see eventPhrases.ts).
 * This file holds only what the voice loop itself says: prompts about listening and parsing.
 */
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
  stopped: 'Stopped listening.',
  notSent: 'Not sent. Press M to say it again, or T to type it.',
  typeInstead: 'Type the reading and press Enter.',
  notAwaiting: 'Not sent. I am not waiting for a reading right now.',
} as const
