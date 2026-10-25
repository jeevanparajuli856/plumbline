import { useEffect, useSyncExternalStore } from 'react'
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

export type ResolvedTheme = 'light' | 'dark' | 'hc'

/** Pure: the theme actually on screen. System follows the OS, high contrast first. */
export function resolvedTheme(
  theme: Theme,
  prefersDark: boolean,
  prefersHighContrast: boolean,
): ResolvedTheme {
  if (theme !== 'system') return theme
  if (prefersHighContrast) return 'hc'
  return prefersDark ? 'dark' : 'light'
}

function matches(query: string): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches
}

function subscribeToOs(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const queries = [window.matchMedia(DARK), window.matchMedia(HIGH_CONTRAST)]
  queries.forEach((q) => q.addEventListener('change', onChange))
  return () => queries.forEach((q) => q.removeEventListener('change', onChange))
}

/** The theme on screen right now, live with the OS while the choice is System. */
export function useResolvedTheme(theme: Theme): ResolvedTheme {
  const os = useSyncExternalStore(
    subscribeToOs,
    () => `${matches(DARK)}|${matches(HIGH_CONTRAST)}`,
    () => 'false|false',
  )
  const [dark, hc] = os.split('|')
  return resolvedTheme(theme, dark === 'true', hc === 'true')
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
