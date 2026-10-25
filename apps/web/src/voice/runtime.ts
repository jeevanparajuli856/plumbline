import { create } from 'zustand'
import type { AnnounceOptions } from '@/a11y/liveQueue'
import { DOMAINS } from '@/state/domains'
import { usePrefs } from '@/state/prefs'
import { useSession } from '@/state/session'
import type { DomainId, SessionData } from '@/state/types'
import {
  DEFAULT_LISTEN_OPTIONS,
  ListenError,
  toListenErrorCode,
  type ListenAdapter,
  type ListenErrorCode,
  type ListenOptions,
} from './listen'
import { createEventPhraser, type Utterance } from './phrases'
import { createSpeaker, type Speaker, type SpeechPort } from './speak'
import { initialVoiceState, voiceReducer, type VoiceEffect, type VoiceEvent, type VoiceState } from './voiceMachine'

/** Performs the machine's effects against the browser and the session store. */
export interface VoiceDeps {
  adapter: ListenAdapter
  port: SpeechPort
  /** Live-region sink for the loop's own prompts (never engine events; the announcer owns those). */
  announce: (text: string, options: AnnounceOptions) => void
  focusTyped: () => void
  listenOptions?: ListenOptions
  win?: Window
}

interface VoiceStore {
  voice: VoiceState
  supported: boolean
}

export const useVoiceStore = create<VoiceStore>(() => ({ voice: initialVoiceState, supported: false }))

const READING_INPUT_LABEL = /^(meter|thermometer) reading in /i

/** Focuses the typed reading input by its UI_CONTRACT label. */
export function focusReadingInput(doc: Document = document): void {
  const labelOf = (input: HTMLInputElement) => [
    input.getAttribute('aria-label') ?? '',
    ...Array.from(input.labels ?? []).map((l) => l.textContent?.trim() ?? ''),
  ]
  const input = Array.from(doc.querySelectorAll('input')).find((i) =>
    labelOf(i).some((text) => READING_INPUT_LABEL.test(text)),
  )
  input?.focus()
}

function errorCode(error: unknown): ListenErrorCode {
  if (error instanceof ListenError) return error.code
  const code = typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined
  return typeof code === 'string' ? toListenErrorCode(code) : 'other'
}

const LISTENING_STATUSES: readonly VoiceState['status'][] = ['listening', 'parsing', 'confirming']

let dispatchActive: ((event: VoiceEvent) => void) | null = null
let stopActive: (() => void) | null = null

/** Sends an event to the running loop; a no-op before startVoiceRuntime or after cleanup. */
export function dispatchVoice(event: VoiceEvent): void {
  dispatchActive?.(event)
}

export function startVoiceRuntime(deps: VoiceDeps): () => void {
  stopActive?.()
  const { adapter, port, win = window } = deps
  const speaker = createSpeaker({ port })
  const listenOptions = deps.listenOptions ?? DEFAULT_LISTEN_OPTIONS
  let listenToken = 0
  /** What "repeat" re-speaks: the last engine phrase of this session, never a loop cue. */
  let lastEngine: SpokenInSession | null = null

  const dispatch = (event: VoiceEvent) => {
    const { state, effects } = voiceReducer(useVoiceStore.getState().voice, event)
    useVoiceStore.setState({ voice: state })
    effects.forEach(run)
  }

  const listen = async () => {
    const token = ++listenToken
    await speaker.whenIdle()
    const stillWanted = () => token === listenToken && LISTENING_STATUSES.includes(useVoiceStore.getState().voice.status)
    if (!stillWanted()) return
    try {
      const { alternatives } = await adapter.start({
        ...listenOptions,
        onAudioEnd: () => stillWanted() && dispatch({ type: 'AUDIO_END' }),
      })
      if (stillWanted()) dispatch({ type: 'RESULT', alternatives, spec: DOMAINS[useSession.getState().domain] })
    } catch (error) {
      if (stillWanted()) dispatch({ type: 'LISTEN_ERROR', code: errorCode(error) })
    }
  }

  const submit = async (value: number) => {
    const session = useSession.getState()
    if (session.phase !== 'awaiting_reading') {
      dispatch({ type: 'SUBMIT_REJECTED' })
      return
    }
    try {
      await session.submitReading(value, 'voice')
    } finally {
      dispatch({ type: 'SUBMIT_DONE' })
    }
  }

  const run = (effect: VoiceEffect) => {
    switch (effect.type) {
      case 'speak':
        return speaker.say(effect.text, effect.priority)
      case 'announce':
        deps.announce(effect.text, { priority: effect.priority })
        return speaker.say(effect.text, effect.priority)
      case 'cancelSpeech':
        return speaker.cancel()
      case 'listen':
        return void listen()
      case 'stopListening':
        listenToken += 1
        return adapter.abort()
      case 'submit':
        return void submit(effect.value).catch(reportSubmitFailure)
      case 'focusTyped':
        return deps.focusTyped()
      case 'repeat': {
        // One source for both channels: the live region and speech repeat the same engine phrase.
        const phrase = repeatablePhrase(lastEngine, useSession.getState())
        if (!phrase) return
        deps.announce(phrase.text, { priority: phrase.priority, force: true })
        return speaker.say(phrase.text, phrase.priority)
      }
    }
  }

  const cleanups = [
    speaker.subscribe((speaking) => dispatch({ type: speaking ? 'SPEECH_START' : 'SPEECH_END' })),
    subscribeEngineEvents(
      (utterance) => {
        const { sessionId, domain } = useSession.getState()
        lastEngine = { sessionId, domain, utterance }
        dispatch({ type: 'SAY', text: utterance.text, priority: utterance.priority })
      },
      () => {
        lastEngine = null
      },
    ),
    subscribeSpeechPreference(speaker),
    unlockOnFirstGesture(win, speaker),
  ]
  dispatchActive = dispatch
  useVoiceStore.setState({ supported: adapter.isSupported() })
  dispatch({ type: 'START', supported: adapter.isSupported() })

  let stopped = false
  const stop = () => {
    if (stopped) return
    stopped = true
    dispatch({ type: 'STOP' })
    cleanups.forEach((fn) => fn())
    if (stopActive !== stop) return
    stopActive = null
    dispatchActive = null
    useVoiceStore.setState({ voice: initialVoiceState, supported: false })
  }
  stopActive = stop
  return stop
}

function subscribeEngineEvents(onUtterance: (u: Utterance) => void, onFreshStart: () => void): () => void {
  const phrase = createEventPhraser(useSession.getState(), { onFreshStart })
  return useSession.subscribe((state) => phrase(state).forEach(onUtterance))
}

interface SpokenInSession {
  sessionId: string | null
  domain: DomainId
  utterance: Utterance
}

/** The last engine phrase if it belongs to the current session and instrument, else the current instruction. */
function repeatablePhrase(last: SpokenInSession | null, session: SessionData): Utterance | null {
  if (last && last.sessionId === session.sessionId && last.domain === session.domain) return last.utterance
  const site = session.instruction && session.catalog?.sites[session.instruction.site]
  return site ? { text: DOMAINS[session.domain].phrases.instruction(site), priority: 'polite' } : null
}

/** The store handles its own errors, so this is unexpected; visible in dev, never swallowed silently. */
function reportSubmitFailure(error: unknown): void {
  if (import.meta.env.DEV) console.error('voice submit failed', error)
}

function subscribeSpeechPreference(speaker: Speaker): () => void {
  return usePrefs.subscribe((prefs, previous) => {
    if (previous.voiceEnabled && !prefs.voiceEnabled) speaker.cancel()
  })
}

function unlockOnFirstGesture(win: Window, speaker: Speaker): () => void {
  const events = ['pointerdown', 'keydown'] as const
  const remove = () => events.forEach((name) => win.removeEventListener(name, onGesture, true))
  function onGesture() {
    speaker.unlock()
    remove()
  }
  events.forEach((name) => win.addEventListener(name, onGesture, true))
  return remove
}
