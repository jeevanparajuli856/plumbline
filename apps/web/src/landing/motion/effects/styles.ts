import { gsap } from '../scroll'
import type { Cleanup } from './types'

/**
 * GSAP's revert leaves residue (`translate: none`, empty `style=""`). Snapshot each element's style
 * attribute before tweening and put it back exactly; clearProps also drops GSAP's transform cache.
 * Runs after the context has reverted its tweens.
 */
export function keepStyles(elements: readonly Element[]): Cleanup {
  const saved = elements.map((el) => [el, el.getAttribute('style')] as const)
  return () => {
    if (saved.length > 0) gsap.set(elements, { clearProps: 'all' })
    saved.forEach(([el, style]) => {
      if (style === null) el.removeAttribute('style')
      else el.setAttribute('style', style)
    })
  }
}
