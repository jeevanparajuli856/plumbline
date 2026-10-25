import type { Cleanup } from './types'

/**
 * Reveals stay in the accessibility tree (opacity, never visibility), so a keyboard user can tab
 * into one before it has played. Finish it at once when focus arrives, so the focused control is
 * visible.
 */
export function showOnFocus(container: Element, tween: gsap.core.Animation): Cleanup {
  const show = () => {
    tween.scrollTrigger?.kill()
    tween.progress(1)
  }
  container.addEventListener('focusin', show)
  return () => container.removeEventListener('focusin', show)
}
