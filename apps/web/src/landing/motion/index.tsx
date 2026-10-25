import type { RefObject } from 'react'
import { gsap, useGSAP } from './scroll'
import { MOTION_ALLOWED, MOTION_NARROW, MOTION_WIDE } from './constants'
import { useHtmlReduceMotion } from './useHtmlReduceMotion'
import { headline, quotes } from './effects/text'
import { bars } from './effects/bars'
import { rows, stats } from './effects/reveal'
import { plumb } from './effects/plumb'
import { refreshOnLoad } from './effects/refresh'
import type { Cleanup } from './effects/types'

interface LandingMotionProps {
  rootRef: RefObject<HTMLElement | null>
}

function runAll(cleanups: readonly Cleanup[]): Cleanup {
  return () => cleanups.forEach((cleanup) => cleanup())
}

/**
 * GSAP motion for the landing's `data-motion` hooks. Lazy-loaded; renders nothing. Tweens exist only
 * under prefers-reduced-motion: no-preference and while `<html data-reduce-motion>` is absent; the
 * static DOM is the final state, and every tween and DOM change reverts on unmount or when motion is
 * turned off.
 */
export default function LandingMotion({ rootRef }: LandingMotionProps) {
  const isReduced = useHtmlReduceMotion()

  useGSAP(
    () => {
      const root = rootRef.current
      if (isReduced || !root) return
      const mm = gsap.matchMedia()
      mm.add(MOTION_ALLOWED, () =>
        runAll([
          headline(root),
          quotes(root),
          rows(root),
          stats(root),
          plumb(root),
          refreshOnLoad(root),
        ]),
      )
      mm.add(MOTION_WIDE, () => bars(root, { pin: true }))
      mm.add(MOTION_NARROW, () => bars(root, { pin: false }))
      return () => mm.revert()
    },
    { scope: rootRef, dependencies: [isReduced], revertOnUpdate: true },
  )

  return null
}
