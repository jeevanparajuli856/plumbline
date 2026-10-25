import { useEffect, type RefObject } from 'react'
import { useLanding, type LandingSection } from '@/state/landing'
import { restingProgress } from './choreography'
import { computeProgress, type SectionBox } from './scrollMath'

/** Sections mark themselves with data-landing-section; a pinned track with data-sticky-track. */
function isPinned(track: HTMLElement): boolean {
  const pin = track.querySelector<HTMLElement>('[data-sticky-pin]')
  return pin !== null && getComputedStyle(pin).position === 'sticky'
}

function measure(root: HTMLElement): SectionBox[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-landing-section]')).map(
    (el) => {
      const id = el.dataset.landingSection as LandingSection
      const rect = el.getBoundingClientRect()
      const trackEl = el.querySelector<HTMLElement>('[data-sticky-track]')
      if (trackEl && isPinned(trackEl)) {
        const t = trackEl.getBoundingClientRect()
        return { id, top: rect.top, height: rect.height, track: { top: t.top, height: t.height } }
      }
      return { id, top: rect.top, height: rect.height }
    },
  )
}

/**
 * Writes one progress scalar and the current section to useLanding from native scroll.
 * No scroll-jacking: a passive listener and one rAF per frame. The page never moves by itself
 * (the old idle snap to sticky states made scrolling jump; removed at the user's review).
 * Reduced motion quantizes progress to resting keyframes.
 */
export function useScrollProgress(rootRef: RefObject<HTMLElement | null>, reduced: boolean): void {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let frame = 0
    let lastProgress = -1
    let lastSection: LandingSection | null = null

    const update = () => {
      frame = 0
      const reading = computeProgress(measure(root), window.innerHeight)
      const progress = reduced ? restingProgress(reading.progress) : reading.progress
      if (Math.abs(progress - lastProgress) < 1e-5 && reading.section === lastSection) return
      lastProgress = progress
      lastSection = reading.section
      useLanding.getState().setProgress(progress, reading.section)
    }
    const requestUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
    }
  }, [rootRef, reduced])
}
