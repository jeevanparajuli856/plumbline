import { flushSync } from 'react-dom'
import { prefersReducedMotion } from '@/a11y/useReducedMotion'
import type { ResolvedTheme } from './useSystemTheme'

/** Length of the circular theme reveal. */
export const REVEAL_MS = 500
const REVEAL_EASING = 'cubic-bezier(0.65, 0, 0.25, 1)'

/** The newest reveal; a skipped older one must not clear html[data-theme-reveal] under it. */
let latest: ReturnType<Document['startViewTransition']> | null = null

/** The toggle flips what is on screen; high contrast is left for light. */
export function toggleTarget(shown: ResolvedTheme): 'light' | 'dark' {
  return shown === 'light' ? 'dark' : 'light'
}

/** Radius that covers the viewport from (x, y): the distance to the farthest corner. */
export function revealRadius(x: number, y: number, width: number, height: number): number {
  return Math.hypot(Math.max(x, width - x), Math.max(y, height - y))
}

/**
 * Runs apply() inside a view transition and grows the new theme as a circle from origin. Instant
 * under reduced motion (OS or the in-page switch) or where the View Transitions API is missing.
 * apply must change the DOM synchronously, so state updates inside it go through flushSync.
 * html[data-theme-reveal] scopes the cross-fade override (viewTransition.css) to this reveal.
 */
export function revealTheme(origin: HTMLElement, apply: () => void): void {
  if (typeof document === 'undefined') return
  const run = () => flushSync(apply)
  if (typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
    run()
    return
  }
  const root = document.documentElement
  const rect = origin.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const r = revealRadius(x, y, window.innerWidth, window.innerHeight)
  root.dataset.themeReveal = 'true'
  const transition = document.startViewTransition(run)
  latest = transition
  transition.ready
    .then(
      () => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
          {
            duration: REVEAL_MS,
            easing: REVEAL_EASING,
            pseudoElement: '::view-transition-new(root)',
          },
        )
      },
      // ready also rejects when apply throws; that case is reported once, from updateCallbackDone.
      (error: unknown) =>
        transition.updateCallbackDone.then(
          () => report(error),
          () => {},
        ),
    )
    .catch(report)
  transition.updateCallbackDone.catch(report)
  const clear = () => {
    if (latest !== transition) return
    latest = null
    delete root.dataset.themeReveal
  }
  transition.finished.then(clear, clear)
}

/** A skipped transition (another started, the tab was hidden) still ran apply, so it is expected. */
function isSkip(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'AbortError' || error.name === 'InvalidStateError')
  )
}

/** Surfaces a real failure to the page's error reporting without breaking the theme switch. */
function report(error: unknown): void {
  if (isSkip(error)) return
  if (typeof window.reportError === 'function') {
    window.reportError(error)
    return
  }
  setTimeout(() => {
    throw error
  })
}
