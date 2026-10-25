import { useEffect, useState } from 'react'
import { useMotionPref } from './motionPref'

function osPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** OS setting or the in-page Reduce motion switch. The store reads this before animating a reveal. */
export function prefersReducedMotion(): boolean {
  return osPrefersReducedMotion() || useMotionPref.getState().reduceMotion
}

/** True when the OS or the in-page switch asks for reduced motion. Scene and DOM snap instead of animating. */
export function useReducedMotion(): boolean {
  const [os, setOs] = useState(osPrefersReducedMotion)
  const inPage = useMotionPref((s) => s.reduceMotion)
  useEffect(() => {
    if (!window.matchMedia) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setOs(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return os || inPage
}
