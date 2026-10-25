import type { RefObject } from 'react'
import { gsap, useGSAP } from './scroll'
import { MOTION_ALLOWED } from './constants'
import { useHtmlReduceMotion } from './useHtmlReduceMotion'
import { useRouteSettled } from './useRouteSettled'
import { headline, quotes } from './effects/text'
import { bars } from './effects/bars'
import { devices } from './effects/device'
import { reveals } from './effects/entrance'
import { parallax } from './effects/parallax'
import { rows, stats } from './effects/reveal'
import { column } from './effects/column'
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
  const settled = useRouteSettled()

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
          column(root),
          bars(root),
          reveals(root),
          devices(root),
          parallax(root),
          refreshOnLoad(root),
        ]),
      )
      return () => mm.revert()
    },
    { scope: rootRef, dependencies: [isReduced, settled], revertOnUpdate: true },
  )

  return null
}
