import { create } from 'zustand'

const STORAGE_KEY = 'plumbline.singleKeyShortcuts'

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

interface ShortcutPrefState {
  singleKeys: boolean
  setSingleKeys(on: boolean): void
}

/**
 * WCAG 2.1.4 Character Key Shortcuts: single-character shortcuts can be turned off (speech-input
 * users trigger them by accident). On by default. Enter and Esc are not gated; they stay native.
 */
export const useShortcutPref = create<ShortcutPrefState>((set) => ({
  singleKeys: readStored(),
  setSingleKeys: (singleKeys) => {
    try {
      if (singleKeys) localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, '0')
    } catch {
      /* storage unavailable */
    }
    set({ singleKeys })
  },
}))
