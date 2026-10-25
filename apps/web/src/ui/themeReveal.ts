import { flushSync } from 'react-dom'
import { prefersReducedMotion } from '@/a11y/useReducedMotion'
import type { ResolvedTheme } from './useSystemTheme'

/** Length of the circular theme reveal. */
export const REVEAL_MS = 500
const REVEAL_EASING = 'cubic-bezier(0.65, 0, 0.25, 1)'

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
 */
export function revealTheme(origin: HTMLElement, apply: () => void): void {
  const run = () => flushSync(apply)
  if (typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
    run()
    return
  }
  const rect = origin.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const r = revealRadius(x, y, window.innerWidth, window.innerHeight)
  document
    .startViewTransition(run)
    .ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        {
          duration: REVEAL_MS,
          easing: REVEAL_EASING,
          pseudoElement: '::view-transition-new(root)',
        },
      )
    })
    // A skipped transition (another one started, tab hidden) still applied the theme.
    .catch(() => {})
}
