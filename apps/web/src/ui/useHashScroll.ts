import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '@/a11y/useReducedMotion'

/**
 * The router does not scroll to #hash targets. After the page renders, scroll the target into view
 * and, except on first load (the skip link stays first), move focus to its `${id}-title` heading.
 */
export function useHashScroll(hash: string, key: string): void {
  // Compare keys, not a "has run" flag: StrictMode re-runs effects with refs kept.
  const initialKey = useRef(key)
  useEffect(() => {
    const isFirstLoad = key === initialKey.current
    const id = hashToId(hash)
    if (!id) return
    // Two frames: after the route's own heading focus (useRouteFocus) and the section's mount.
    let inner = 0
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => {
        const target = document.getElementById(id)
        if (!target) return
        target.scrollIntoView({ behavior: prefersReducedMotion() ? 'instant' : 'smooth' })
        if (isFirstLoad) return
        const heading = document.getElementById(`${id}-title`) ?? target
        if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1')
        heading.focus({ preventScroll: true })
      })
    })
    return () => {
      window.cancelAnimationFrame(outer)
      window.cancelAnimationFrame(inner)
    }
  }, [hash, key])
}

/** "#a%20b" -> "a b"; a malformed escape falls back to the raw text rather than throwing. */
function hashToId(hash: string): string {
  const raw = hash.slice(1)
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}
