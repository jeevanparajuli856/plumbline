import { useEffect, useRef } from 'react'

/**
 * On a route change: start the new page at its top, then move focus to its h1 so screen readers
 * announce it. Not on first load, so the skip link stays first. A link with a hash keeps its own
 * scroll target (ui/useHashScroll). Focus never scrolls: without preventScroll, Chrome nudged the
 * page down to "reveal" the focused heading on /how-it-works.
 */
export function useRouteFocus(pathname: string): void {
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const frame = window.requestAnimationFrame(() => {
      if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      focusHeading()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [pathname])
}

export function focusHeading(): boolean {
  const h1 = document.querySelector<HTMLElement>('main h1')
  if (!h1) return false
  if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1')
  h1.focus({ preventScroll: true })
  return true
}
