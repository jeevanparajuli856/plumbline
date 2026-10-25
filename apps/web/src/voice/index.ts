import { announce } from '@/a11y/liveQueue'
import { usePrefs } from '@/state/prefs'
import { pickListenAdapter } from './listen'
import { dispatchVoice, focusReadingInput, startVoiceRuntime, useVoiceStore, type VoiceDeps } from './runtime'
import { webSpeechPort, type SpeechPort } from './speak'
import type { VoiceStatus } from './voiceMachine'

/** Public voice API (docs/UI_CONTRACT.md section 4). */
export interface VoiceControls {
  supported: boolean
  listening: boolean
  toggleListen(): void
  speakingEnabled: boolean
}

const OPEN_MIC: readonly VoiceStatus[] = ['listening', 'parsing', 'confirming']

/** Where the browser has no synthesizer, speech finishes at once and nothing plays. */
const silentPort: SpeechPort = { speak: (_text, onDone) => onDone(), cancel: () => {} }

/** Call once at app start; returns the cleanup. Speaks only when prefs.voiceEnabled is true. */
export function startVoice(overrides: Partial<VoiceDeps> = {}): () => void {
  return startVoiceRuntime({
    adapter: overrides.adapter ?? pickListenAdapter(),
    port: overrides.port ?? webSpeechPort() ?? silentPort,
    announce: overrides.announce ?? announce,
    focusTyped: overrides.focusTyped ?? (() => focusReadingInput()),
    ...(overrides.listenOptions ? { listenOptions: overrides.listenOptions } : {}),
    ...(overrides.win ? { win: overrides.win } : {}),
  })
}

/** Bound to the M key and the Listen button. */
export function toggleListen(): void {
  dispatchVoice({ type: 'TOGGLE_LISTEN' })
}

/** Bound to Esc: closes the microphone without sending anything. */
export function cancelListen(): void {
  dispatchVoice({ type: 'CANCEL' })
}

export function readVoiceStatus(): VoiceStatus {
  return useVoiceStore.getState().voice.status
}

export function useVoiceStatus(): VoiceStatus {
  return useVoiceStore((s) => s.voice.status)
}

export function useVoice(): VoiceControls {
  const supported = useVoiceStore((s) => s.supported)
  const listening = useVoiceStore((s) => OPEN_MIC.includes(s.voice.status))
  const speakingEnabled = usePrefs((s) => s.voiceEnabled)
  return { supported, listening, toggleListen, speakingEnabled }
}
