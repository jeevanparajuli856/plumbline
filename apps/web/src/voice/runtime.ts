import { create } from 'zustand'
import type { AnnounceOptions } from '@/a11y/liveQueue'
import { DOMAINS } from '@/state/domains'
import { usePrefs } from '@/state/prefs'
import { useSession } from '@/state/session'
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
  repeat: () => void
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

/** Sends an event to the running loop; a no-op before startVoiceRuntime or after cleanup. */
export function dispatchVoice(event: VoiceEvent): void {
  dispatchActive?.(event)
}

export function startVoiceRuntime(deps: VoiceDeps): () => void {
  if (dispatchActive) dispatchVoice({ type: 'STOP' })
  const { adapter, port, win = window } = deps
  const speaker = createSpeaker({ port })
  const listenOptions = deps.listenOptions ?? DEFAULT_LISTEN_OPTIONS
  let listenToken = 0
  /** What "repeat" re-speaks: the last engine phrase, never a loop cue like "Listening.". */
  let lastEngineUtterance: Utterance | null = null

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
    await session.submitReading(value, 'voice')
    dispatch({ type: 'SUBMIT_DONE' })
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
        return void submit(effect.value)
      case 'focusTyped':
        return deps.focusTyped()
      case 'repeat':
        deps.repeat()
        if (lastEngineUtterance) speaker.say(lastEngineUtterance.text, lastEngineUtterance.priority)
        return
    }
  }

  const cleanups = [
    speaker.subscribe((speaking) => dispatch({ type: speaking ? 'SPEECH_START' : 'SPEECH_END' })),
    subscribeEngineEvents((u) => {
      lastEngineUtterance = u
      dispatch({ type: 'SAY', text: u.text, priority: u.priority })
    }),
    subscribeSpeechPreference(speaker),
    unlockOnFirstGesture(win, speaker),
  ]
  dispatchActive = dispatch
  useVoiceStore.setState({ supported: adapter.isSupported() })
  dispatch({ type: 'START', supported: adapter.isSupported() })

  return () => {
    dispatch({ type: 'STOP' })
    cleanups.forEach((fn) => fn())
    if (dispatchActive === dispatch) dispatchActive = null
    useVoiceStore.setState({ voice: initialVoiceState, supported: false })
  }
}

function subscribeEngineEvents(onUtterance: (u: Utterance) => void): () => void {
  const phrase = createEventPhraser(useSession.getState())
  return useSession.subscribe((state) => phrase(state).forEach(onUtterance))
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
