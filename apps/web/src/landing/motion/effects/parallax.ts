import { gsap } from '../scroll'
import { PARALLAX_RANGE_PX } from '../constants'
import { parseDepth } from '../helpers'
import { keepStyles } from './styles'
import type { Cleanup } from './types'

/**
 * Generated art and renders drift with scroll by their `data-motion-depth`: from below their
 * resting place as they enter to above it as they leave, crossing it mid-viewport.
 */
export function parallax(root: HTMLElement): Cleanup {
  const layers = Array.from(
    root.querySelectorAll<HTMLElement>('[data-motion="parallax"], [data-motion-depth]'),
  ).flatMap((el) => {
    const depth = parseDepth(el.dataset.motionDepth ?? null)
    return depth === null ? [] : [{ el, travel: depth * PARALLAX_RANGE_PX }]
  })
  const restore = keepStyles(layers.map(({ el }) => el))
  layers.forEach(({ el, travel }) => {
    gsap.fromTo(
      el,
      { y: travel },
      {
        y: -travel,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    )
  })
  return restore
}
