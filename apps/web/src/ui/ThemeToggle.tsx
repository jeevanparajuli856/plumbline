import { useRef } from 'react'
import { applyTheme, usePrefs } from '@/state/prefs'
import { ThemeGlyph } from './ThemeGlyph'
import { revealTheme, toggleTarget } from './themeReveal'
import { useResolvedTheme } from './useSystemTheme'
import './viewTransition.css'

/**
 * One press flips the theme on screen, light to dark or dark to light, and stores it (UI_CONTRACT
 * 5.1). The glyph shows where the press goes, so it agrees with the name. Theme radios with System
 * and High contrast live in DisplaySettings.
 */
export function ThemeToggle() {
  const theme = usePrefs((s) => s.theme)
  const setTheme = usePrefs((s) => s.setTheme)
  const target = toggleTarget(useResolvedTheme(theme))
  const ref = useRef<HTMLButtonElement>(null)

  const onClick = () => {
    const button = ref.current
    if (!button) return
    revealTheme(button, () => {
      applyTheme(target)
      setTheme(target)
    })
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-button border-[1.5px] border-border-strong text-text transition-colors duration-[var(--motion-fast)] hover:bg-surface-2"
    >
      <ThemeGlyph theme={target} />
      <span className="sr-only">Switch to {target} theme</span>
    </button>
  )
}
