import { useEffect } from 'react'
import { useLanding } from '@/state/landing'

/** How far the home hero eases the circuit from its rest pose toward the closer view. */
export const CIRCUIT_DRIFT_MAX = 0.18
export const CIRCUIT_DRIFT_PERIOD_MS = 14000

/**
 * A slow out-and-back through the opening of the circuit move. 0 is the rest pose; the max stays
 * short of the play pose, so the board remains on the right, beside the phones.
 */
export function circuitDrift(elapsedMs: number, periodMs = CIRCUIT_DRIFT_PERIOD_MS): number {
  if (!Number.isFinite(elapsedMs) || !Number.isFinite(periodMs) || periodMs <= 0) return 0
  const wrapped = ((elapsedMs % periodMs) + periodMs) % periodMs
  const wave = (1 - Math.cos((wrapped / periodMs) * Math.PI * 2)) / 2
  return wave * CIRCUIT_DRIFT_MAX
}

/** While the hero is at rest, ease the circuit. Scrolling and reduced motion leave the scroll pose. */
export function useCircuitDrift(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    const narrow = window.matchMedia('(max-width: 767px)')
    if (narrow.matches) return
    let frame = 0
    let quietTimer = 0
    let quiet = true
    const start = performance.now()

    const onScroll = () => {
      quiet = false
      window.clearTimeout(quietTimer)
      quietTimer = window.setTimeout(() => {
        quiet = true
      }, 700)
    }

    const tick = (now: number) => {
      const hero = document.getElementById('hero')
      const rect = hero?.getBoundingClientRect()
      const onScreen = !!rect && rect.bottom > 0 && rect.top < window.innerHeight
      if (quiet && onScreen && window.scrollY < 32 && document.visibilityState === 'visible') {
        useLanding.getState().setProgress(circuitDrift(now - start), 'mast')
      }
      frame = requestAnimationFrame(tick)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    frame = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.clearTimeout(quietTimer)
      cancelAnimationFrame(frame)
    }
  }, [enabled])
}
