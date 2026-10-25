import { useEffect } from 'react'
import type { Theme } from '@/state/prefs'

const DARK = '(prefers-color-scheme: dark)'
const HIGH_CONTRAST = '(prefers-contrast: more), (forced-colors: active)'

/** Pure: which OS-following class tokens.css should see. High contrast wins over dark. */
export function systemThemeClass(
  prefersDark: boolean,
  prefersHighContrast: boolean,
): 'prefers-hc' | 'prefers-dark' | null {
  if (prefersHighContrast) return 'prefers-hc'
  if (prefersDark) return 'prefers-dark'
  return null
}

/** With theme "system", mirrors the OS onto <html class="prefers-dark|prefers-hc"> (tokens.css keys off it). */
export function useSystemTheme(theme: Theme): void {
  useEffect(() => {
    const root = document.documentElement
    const clear = () => root.classList.remove('prefers-dark', 'prefers-hc')
    if (theme !== 'system' || !window.matchMedia) {
      clear()
      return
    }
    const dark = window.matchMedia(DARK)
    const hc = window.matchMedia(HIGH_CONTRAST)
    const apply = () => {
      clear()
      const cls = systemThemeClass(dark.matches, hc.matches)
      if (cls) root.classList.add(cls)
    }
    apply()
    dark.addEventListener('change', apply)
    hc.addEventListener('change', apply)
    return () => {
      dark.removeEventListener('change', apply)
      hc.removeEventListener('change', apply)
      clear()
    }
  }, [theme])
}
