import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'system' | 'light' | 'dark' | 'hc'

interface PrefsState {
  theme: Theme
  voiceEnabled: boolean
  textOnly: boolean
  setTheme(theme: Theme): void
  setVoiceEnabled(on: boolean): void
  setTextOnly(on: boolean): void
}

/** Per-viewer conveniences only. Speech is off by default; aria-live is always on. */
export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      theme: 'system',
      voiceEnabled: false,
      textOnly: false,
      setTheme: (theme) => set({ theme }),
      setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
      setTextOnly: (textOnly) => set({ textOnly }),
    }),
    { name: 'plumbline.prefs' },
  ),
)

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'system') {
    delete root.dataset.theme
    try {
      localStorage.removeItem('plumbline.theme')
    } catch {
      /* storage unavailable */
    }
    return
  }
  root.dataset.theme = theme
  try {
    localStorage.setItem('plumbline.theme', theme)
  } catch {
    /* storage unavailable */
  }
}
