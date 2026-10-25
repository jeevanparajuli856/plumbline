import { ListenError, toListenErrorCode, type ListenAdapter, type ListenResult } from '../listen'

/** The slice of the (unprefixed or webkit) SpeechRecognition API this adapter uses. */
interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}

interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: RecognitionResultEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  onspeechend: (() => void) | null
  start(): void
  abort(): void
}

type RecognitionConstructor = new () => Recognition

interface RecognitionWindow {
  SpeechRecognition?: RecognitionConstructor
  webkitSpeechRecognition?: RecognitionConstructor
}

function recognitionConstructor(win: Window): RecognitionConstructor | undefined {
  const w = win as unknown as RecognitionWindow
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

function transcripts(event: RecognitionResultEvent): string[] {
  const first = event.results[0]
  if (!first) return []
  return Array.from({ length: first.length }, (_, i) => first[i]?.transcript.trim() ?? '').filter(Boolean)
}

export function createWebAdapter(win: Window = window): ListenAdapter {
  let active: { recognition: Recognition; settle: (error: ListenError) => void } | null = null

  const abort = () => {
    const current = active
    if (!current) return
    current.settle(new ListenError('aborted'))
    current.recognition.abort()
  }

  return {
    isSupported: () => recognitionConstructor(win) !== undefined,
    abort,
    start(options) {
      const Ctor = recognitionConstructor(win)
      if (!Ctor) return Promise.reject(new ListenError('unsupported'))
      abort()
      return new Promise<ListenResult>((resolve, reject) => {
        const recognition = new Ctor()
        let settled = false
        const finish = (outcome: () => void) => {
          if (settled) return
          settled = true
          window.clearTimeout(timer)
          if (active?.recognition === recognition) active = null
          outcome()
        }
        const fail = (error: ListenError) => finish(() => reject(error))
        const timer = window.setTimeout(() => {
          fail(new ListenError('no-speech'))
          recognition.abort()
        }, options.timeoutMs)
        recognition.lang = options.lang
        recognition.continuous = false
        recognition.interimResults = false
        recognition.maxAlternatives = options.maxAlternatives
        recognition.onresult = (event) => finish(() => resolve({ alternatives: transcripts(event) }))
        recognition.onerror = (event) => fail(new ListenError(toListenErrorCode(event.error)))
        recognition.onend = () => fail(new ListenError('no-speech'))
        recognition.onspeechend = () => options.onAudioEnd?.()
        active = { recognition, settle: fail }
        recognition.start()
      })
    },
  }
}
