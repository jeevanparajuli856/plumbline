import { useEffect, type RefObject } from 'react'
import { useLanding, type LandingSection } from '@/state/landing'
import { STICKY_STATES, isStickySection, restingProgress } from './choreography'
import { computeProgress, snapTarget, type SectionBox } from './scrollMath'

/** Quiet time after the last scroll event before a sticky scene snaps to a named state. */
export const SNAP_IDLE_MS = 180

/** Sections mark themselves with data-landing-section; a pinned track with data-sticky-track. */
function isPinned(track: HTMLElement): boolean {
  const pin = track.querySelector<HTMLElement>('[data-sticky-pin]')
  return pin !== null && getComputedStyle(pin).position === 'sticky'
}

function measure(root: HTMLElement): {
  boxes: SectionBox[]
  tracks: Map<LandingSection, HTMLElement>
} {
  const tracks = new Map<LandingSection, HTMLElement>()
  const boxes = Array.from(root.querySelectorAll<HTMLElement>('[data-landing-section]')).map(
    (el) => {
      const id = el.dataset.landingSection as LandingSection
      const rect = el.getBoundingClientRect()
      const trackEl = el.querySelector<HTMLElement>('[data-sticky-track]')
      if (trackEl && isPinned(trackEl)) {
        tracks.set(id, trackEl)
        const t = trackEl.getBoundingClientRect()
        return { id, top: rect.top, height: rect.height, track: { top: t.top, height: t.height } }
      }
      return { id, top: rect.top, height: rect.height }
    },
  )
  return { boxes, tracks }
}

/**
 * Writes one progress scalar and the current section to useLanding from native scroll.
 * No scroll-jacking: a passive listener, one rAF per frame, and a single snap after the reader
 * stops inside a pinned scene. Reduced motion quantizes progress to resting keyframes.
 */
export function useScrollProgress(rootRef: RefObject<HTMLElement | null>, reduced: boolean): void {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let frame = 0
    let idle: number | undefined
    let pointerDown = false
    let lastProgress = -1
    let lastSection: LandingSection | null = null

    const update = () => {
      frame = 0
      const vh = window.innerHeight
      const { boxes } = measure(root)
      const reading = computeProgress(boxes, vh)
      const progress = reduced ? restingProgress(reading.progress) : reading.progress
      if (Math.abs(progress - lastProgress) < 1e-5 && reading.section === lastSection) return
      lastProgress = progress
      lastSection = reading.section
      useLanding.getState().setProgress(progress, reading.section)
    }

    const snap = () => {
      if (pointerDown) return
      const vh = window.innerHeight
      const { boxes, tracks } = measure(root)
      const { section } = computeProgress(boxes, vh)
      const track = tracks.get(section)
      if (!track || !isStickySection(section)) return
      const rect = track.getBoundingClientRect()
      const target = snapTarget(window.scrollY, rect, vh, STICKY_STATES[section])
      if (!target) return
      window.scrollTo({ top: target.scrollY, behavior: reduced ? 'instant' : 'smooth' })
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
      window.clearTimeout(idle)
      idle = window.setTimeout(snap, SNAP_IDLE_MS)
    }
    const onPointerDown = () => {
      pointerDown = true
    }
    const onPointerUp = () => {
      pointerDown = false
      onScroll()
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    window.addEventListener('pointercancel', onPointerUp, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(idle)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [rootRef, reduced])
}
