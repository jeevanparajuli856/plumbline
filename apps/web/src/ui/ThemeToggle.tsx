import { useRef } from 'react'
import { applyTheme, usePrefs } from '@/state/prefs'
import { ThemeGlyph } from './ThemeGlyph'
import { revealTheme, toggleTarget } from './themeReveal'
import { currentResolvedTheme, useResolvedTheme } from './useSystemTheme'
import './viewTransition.css'

/**
 * One press flips the theme on screen, light to dark or dark to light, and stores it (UI_CONTRACT
 * 5.1). The glyph shows where the press goes, so it agrees with the name. Theme radios with System
 * and High contrast live in DisplaySettings.
 */
export function ThemeToggle() {
  const theme = usePrefs((s) => s.theme)
  const target = toggleTarget(useResolvedTheme(theme))
  const ref = useRef<HTMLButtonElement>(null)

  const onClick = () => {
    const button = ref.current
    if (!button) return
    // Decide inside the callback from current state, so two quick presses flip twice.
    revealTheme(button, () => {
      const prefs = usePrefs.getState()
      const next = toggleTarget(currentResolvedTheme(prefs.theme))
      // Set data-theme here, not in App's effect: the transition snapshots the DOM as the callback returns.
      applyTheme(next)
      prefs.setTheme(next)
    })
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-button border-[1.5px] border-border-strong text-text transition-colors duration-[var(--motion-fast)] hover:bg-surface-2"
    >
      {/* Named during the reveal (viewTransition.css) so it turns while the theme swaps. */}
      <span className="theme-glyph inline-flex">
        <ThemeGlyph theme={target} />
      </span>
      <span className="sr-only">Switch to {target} theme</span>
    </button>
  )
}
