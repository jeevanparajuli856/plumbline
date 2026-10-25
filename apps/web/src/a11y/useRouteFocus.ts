import { useEffect, useRef } from 'react'

/** Moves focus to the page h1 when the route changes (not on first load, so the skip link stays first). */
export function useRouteFocus(pathname: string): void {
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const frame = window.requestAnimationFrame(() => focusHeading())
    return () => window.cancelAnimationFrame(frame)
  }, [pathname])
}

export function focusHeading(): boolean {
  const h1 = document.querySelector<HTMLElement>('main h1')
  if (!h1) return false
  if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1')
  h1.focus()
  return true
}
