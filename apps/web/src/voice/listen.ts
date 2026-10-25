import { createWebAdapter } from './adapters/web'
import { installFakeRecognition } from './stubs/fakeRecognition'

/**
 * Recognition adapter contract. The machine and runtime never touch window.SpeechRecognition,
 * so the Capacitor build (ADR-0009) swaps the adapter without touching the loop.
 */
export type ListenErrorCode =
  | 'no-speech'
  | 'aborted'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'audio-capture'
  | 'network'
  | 'language-not-supported'
  | 'unsupported'
  | 'other'

const KNOWN_CODES: readonly string[] = [
  'no-speech',
  'aborted',
  'not-allowed',
  'service-not-allowed',
  'audio-capture',
  'network',
  'language-not-supported',
]

export class ListenError extends Error {
  readonly code: ListenErrorCode

  constructor(code: ListenErrorCode) {
    super(`speech recognition: ${code}`)
    this.name = 'ListenError'
    this.code = code
  }
}

export function toListenErrorCode(raw: string): ListenErrorCode {
  return KNOWN_CODES.includes(raw) ? (raw as ListenErrorCode) : 'other'
}

export interface ListenOptions {
  lang: string
  maxAlternatives: number
  timeoutMs: number
  /** Audio stopped; the recognizer is still working out the words. */
  onAudioEnd?: () => void
}

export interface ListenResult {
  alternatives: string[]
}

export interface ListenAdapter {
  isSupported(): boolean
  start(options: ListenOptions): Promise<ListenResult>
  abort(): void
}

export const DEFAULT_LISTEN_OPTIONS: ListenOptions = {
  lang: 'en-US',
  maxAlternatives: 3,
  timeoutMs: 8000,
}

export interface VoiceBuildEnv {
  DEV: boolean
  MODE: string
}

/** The Playwright stub needs the query flag AND a dev or test build; never production. */
export function fakeVoiceAllowed(search: string, env: VoiceBuildEnv): boolean {
  const isTestBuild = env.DEV || env.MODE === 'test'
  return isTestBuild && new URLSearchParams(search).get('fakeVoice') === '1'
}

export function pickListenAdapter(
  win: Window = window,
  env: VoiceBuildEnv = import.meta.env,
): ListenAdapter {
  if (fakeVoiceAllowed(win.location.search, env)) return installFakeRecognition(win)
  return createWebAdapter(win)
}
