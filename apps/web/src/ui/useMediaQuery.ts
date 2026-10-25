import { useSyncExternalStore } from 'react'

/** Live match for a media query. Without matchMedia (tests, old engines) it returns the fallback. */
export function useMediaQuery(query: string, fallback: boolean): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () =>
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia(query).matches
        : fallback,
    () => fallback,
  )
}
