import { useEffect, useRef, type RefObject } from 'react'
import { focusHeading } from '@/a11y/useRouteFocus'
import type { Mode, Phase, ReadingSource } from '@/state/types'
import { focusTarget, type FocusTarget } from './flow'

export type FocusRefs = Record<Exclude<FocusTarget, null>, RefObject<HTMLElement | null>>

interface FocusInputs {
  phase: Phase
  hasWarning: boolean
  mode: Mode
  lastSource: ReadingSource | null
}

/**
 * True when focus fell to the page because the element holding it left the DOM (a rewind removed
 * the focused diagnosis or warning), not because the person moved it away themselves.
 */
function isFocusLost(lastFocused: Element | null): boolean {
  const active = document.activeElement
  const onPage = active === null || active === document.body
  return onPage && lastFocused !== null && !lastFocused.isConnected
}

/**
 * Applies the focus rules from flow.ts after each phase change, once the target has rendered.
 * When the focused outcome region is removed without a new target, focus goes to the warning
 * if one is showing, otherwise to the page h1, so a screen reader is never left on the body.
 */
export function useSimFocus(
  { phase, hasWarning, mode, lastSource }: FocusInputs,
  refs: FocusRefs,
): void {
  const prev = useRef<Phase>(phase)
  const lastFocused = useRef<Element | null>(null)
  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      lastFocused.current = event.target instanceof Element ? event.target : null
    }
    document.addEventListener('focusin', onFocusIn)
    return () => document.removeEventListener('focusin', onFocusIn)
  }, [])
  useEffect(() => {
    const target = focusTarget(prev.current, phase, { hasWarning, mode, lastSource })
    prev.current = phase
    if (!target && !isFocusLost(lastFocused.current)) return
    // If the person moved focus themselves before the frame (pressed T, tabbed), leave it there.
    const before = document.activeElement
    const frame = window.requestAnimationFrame(() => {
      if (document.activeElement !== before) return
      if (target) refs[target].current?.focus()
      else if (isFocusLost(lastFocused.current)) {
        const warning = refs.warning.current
        if (warning) warning.focus()
        else focusHeading()
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [phase, hasWarning, mode, lastSource, refs])
}
