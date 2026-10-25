import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useLocation } from 'react-router'
import { usePrefs } from '@/state/prefs'
import { DisplaySettings } from './DisplaySettings'
import { THEMES } from './themes'
import { nextTrapIndex, tabbables } from './focusTrap'
import { ThemeGlyph } from './ThemeGlyph'
import { useResolvedTheme } from './useSystemTheme'

/**
 * The one theme button and its non-modal Display popover (UI_CONTRACT 5.1). Opening focuses the
 * checked Theme radio; Tab wraps inside; Esc or the button closes and returns focus to the button;
 * a click outside closes without taking focus; any navigation closes it.
 */
export function DisplayMenu() {
  const theme = usePrefs((s) => s.theme)
  const shown = useResolvedTheme(theme)
  const label = THEMES.find((t) => t.value === theme)?.label ?? 'System'
  const location = useLocation()
  // Open belongs to one location: a route change closes it without an effect.
  const [openAt, setOpenAt] = useState<string | null>(null)
  const open = openAt === location.key
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const popoverId = useId()
  const titleId = useId()

  useEffect(() => {
    const popover = popoverRef.current
    if (!open || !popover) return
    const close = () => {
      setOpenAt(null)
      buttonRef.current?.focus()
    }
    popover.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus()
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenAt(null)
    }
    const onKeyDown = (event: KeyboardEvent) => trapKeys(event, popover, close)
    document.addEventListener('pointerdown', onPointerDown)
    popover.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      popover.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Safari does not focus a clicked button, so closing from the button puts focus back explicitly.
  const onButtonClick = () => {
    if (!open) return setOpenAt(location.key)
    setOpenAt(null)
    buttonRef.current?.focus()
  }

  const onButtonKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!open || event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    setOpenAt(null)
  }

  return (
    <div ref={rootRef} className="sm:relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={onButtonClick}
        onKeyDown={onButtonKeyDown}
        className="inline-flex size-11 items-center justify-center rounded-button border-[1.5px] border-border-strong text-text transition-colors duration-[var(--motion-fast)] hover:bg-surface-2 aria-expanded:bg-text aria-expanded:text-bench aria-expanded:hover:bg-text"
      >
        <ThemeGlyph theme={shown} />
        {/* display:none drops a span from the name, so each breakpoint gets its own wording. */}
        <span className="sr-only max-sm:hidden">Theme: {label}. Open display settings</span>
        <span className="sr-only sm:hidden">Display settings. Theme: {label}</span>
      </button>
      <div
        ref={popoverRef}
        id={popoverId}
        role="dialog"
        aria-labelledby={titleId}
        hidden={!open}
        className="absolute inset-x-4 top-[calc(var(--header-height)-0.5rem)] z-30 rounded-card border-[1.5px] border-border-strong bg-surface-1 p-5 text-text sm:inset-x-auto sm:right-0 sm:top-[calc(100%+0.75rem)] sm:w-[21rem]"
      >
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 id={titleId} className="font-display text-h3 font-semibold leading-none">
            Display
          </h2>
          <span aria-hidden="true" className="font-mono text-caption text-text-muted">
            Esc closes
          </span>
        </div>
        <DisplaySettings />
      </div>
    </div>
  )
}

/** Esc closes (and stops before the simulator's own Esc shortcut); Tab and Shift+Tab wrap. */
function trapKeys(event: KeyboardEvent, popover: HTMLElement, close: () => void): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    close()
    return
  }
  if (event.key !== 'Tab') return
  const items = tabbables(popover)
  const at = items.indexOf(document.activeElement as HTMLElement)
  const next = nextTrapIndex(at, items.length, event.shiftKey)
  if (next === null) return
  event.preventDefault()
  items[next]?.focus()
}
