import { registerShortcut } from '@/a11y/shortcutRegistry'
import { cancelListen, readVoiceStatus, startVoice, toggleListen } from './index'

const OPEN_MIC = new Set(['listening', 'parsing', 'confirming'])

/**
 * App-level voice wiring: starts the voice runtime and claims M (listen) and Esc (cancel
 * listening) through the shared shortcut registry. Returns one cleanup for all of it.
 */
export function wireVoice(): () => void {
  const stopVoice = startVoice()
  const offListen = registerShortcut('listen', () => {
    toggleListen()
  })
  const offEscape = registerShortcut('escape', () => {
    if (!OPEN_MIC.has(readVoiceStatus())) return false
    cancelListen()
    return true
  })
  return () => {
    offEscape()
    offListen()
    stopVoice()
  }
}
