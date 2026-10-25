import { usePrefs } from '@/state/prefs'

/**
 * Speech output queue. Off unless the viewer turned speech on (aria-live is always on, so a
 * screen-reader user is never doubled). Assertive speech cancels whatever is playing.
 */
export type SpeechPriority = 'polite' | 'assertive'

/** Some engines truncate long utterances; every chunk stays strictly under this length. */
export const MAX_CHUNK_CHARS = 200
const SPEECH_LANG = 'en-US'

/** The only surface speak.ts needs from a synthesizer. `onDone` fires on end or error. */
export interface SpeechPort {
  speak(text: string, onDone: () => void): void
  cancel(): void
}

export interface Speaker {
  say(text: string, priority?: SpeechPriority): void
  /** Call inside the first user gesture; iOS and Chrome refuse speech before one. */
  unlock(): void
  cancel(): void
  repeatLast(): void
  isSpeaking(): boolean
  whenIdle(): Promise<void>
  subscribe(listener: (speaking: boolean) => void): () => void
}

export interface SpeakerOptions {
  port: SpeechPort
  isEnabled?: () => boolean
}

export function chunkText(text: string, max = MAX_CHUNK_CHARS): string[] {
  const sentences = text.trim().split(/(?<=[.!?])\s+/).filter(Boolean)
  const pieces = sentences.flatMap((s) => (s.length < max ? [s] : splitClause(s, max)))
  return pieces.reduce<string[]>((chunks, piece) => {
    const last = chunks[chunks.length - 1]
    if (last !== undefined && last.length + 1 + piece.length < max) {
      return [...chunks.slice(0, -1), `${last} ${piece}`]
    }
    return [...chunks, piece]
  }, [])
}

function splitClause(sentence: string, max: number): string[] {
  const clauses = sentence.split(/(?<=[,;:])\s+/)
  return clauses.flatMap((c) => (c.length < max ? [c] : splitWords(c, max)))
}

function splitWords(clause: string, max: number): string[] {
  return clause.split(/\s+/).reduce<string[]>((lines, word) => {
    const last = lines[lines.length - 1]
    if (last !== undefined && last.length + 1 + word.length < max) {
      return [...lines.slice(0, -1), `${last} ${word}`]
    }
    return [...lines, word.slice(0, max - 1)]
  }, [])
}

export function createSpeaker({
  port,
  isEnabled = () => usePrefs.getState().voiceEnabled,
}: SpeakerOptions): Speaker {
  let queue: string[] = []
  let current: string | null = null
  let unlocked = false
  let generation = 0
  let lastText: string | null = null
  const listeners = new Set<(speaking: boolean) => void>()
  let idleWaiters: Array<() => void> = []

  const setCurrent = (next: string | null) => {
    const was = current !== null
    current = next
    const is = current !== null
    if (was !== is) listeners.forEach((fn) => fn(is))
    if (!is) {
      idleWaiters.forEach((resolve) => resolve())
      idleWaiters = []
    }
  }

  const playNext = () => {
    if (!isEnabled()) queue = []
    const [next, ...rest] = queue
    queue = rest
    if (next === undefined) {
      setCurrent(null)
      return
    }
    const token = generation
    setCurrent(next)
    // Cancelled utterances still fire onend/onerror; the generation token ignores them.
    port.speak(next, () => {
      if (token === generation) playNext()
    })
  }

  const pump = () => {
    if (unlocked && current === null) playNext()
  }

  const cancel = () => {
    generation += 1
    queue = []
    port.cancel()
    setCurrent(null)
  }

  return {
    say(text, priority = 'polite') {
      if (!isEnabled()) return
      const chunks = chunkText(text)
      if (chunks.length === 0) return
      lastText = text
      if (priority === 'assertive') cancel()
      queue = [...queue, ...chunks]
      pump()
    },
    unlock() {
      if (unlocked) return
      unlocked = true
      port.speak('', () => {})
      pump()
    },
    cancel,
    repeatLast() {
      if (lastText !== null) this.say(lastText)
    },
    isSpeaking: () => current !== null,
    whenIdle() {
      if (current === null) return Promise.resolve()
      return new Promise((resolve) => idleWaiters.push(resolve))
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/** Browser speechSynthesis behind the port. Null where the browser has none. */
export function webSpeechPort(win: Window = window): SpeechPort | null {
  const synth = 'speechSynthesis' in win ? win.speechSynthesis : undefined
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return null
  let voice: SpeechSynthesisVoice | undefined
  return {
    speak(text, onDone) {
      voice ??= synth.getVoices().find((v) => v.lang === SPEECH_LANG)
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = SPEECH_LANG
      if (voice) utterance.voice = voice
      utterance.onend = () => onDone()
      utterance.onerror = () => onDone()
      synth.speak(utterance)
    },
    cancel: () => synth.cancel(),
  }
}
