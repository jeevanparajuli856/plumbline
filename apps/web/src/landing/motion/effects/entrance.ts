import { gsap } from '../scroll'
import {
  REVEAL_DURATION_S,
  REVEAL_ITEM_RISE_PX,
  REVEAL_MASK_DURATION_S,
  REVEAL_RISE_PX,
  REVEAL_STAGGER_S,
  REVEAL_START,
} from '../constants'
import { revealVariant, type RevealVariant } from '../helpers'
import { showOnFocus } from './focus'
import { keepStyles } from './styles'
import type { Cleanup } from './types'

/** Clipped away from the top down to nothing, then opened upward: a bottom-to-top wipe. */
const MASK_HIDDEN = 'inset(100% 0% 0% 0%)'
const MASK_SHOWN = 'inset(0% 0% 0% 0%)'

function once(el: Element) {
  return { trigger: el, start: REVEAL_START, once: true }
}

/** Builds the one-shot tween for one block. `items` are its stagger children, if any. */
function enter(
  el: HTMLElement,
  variant: RevealVariant,
  items: readonly Element[],
): gsap.core.Tween {
  if (variant === 'mask') {
    return gsap.fromTo(
      el,
      { clipPath: MASK_HIDDEN },
      {
        clipPath: MASK_SHOWN,
        duration: REVEAL_MASK_DURATION_S,
        ease: 'power3.inOut',
        // A clip left in place would cut off focus rings and overflow; the static DOM has none.
        clearProps: 'clipPath',
        scrollTrigger: once(el),
      },
    )
  }
  if (variant === 'stagger') {
    return gsap.from(items, {
      y: REVEAL_ITEM_RISE_PX,
      opacity: 0,
      duration: REVEAL_DURATION_S,
      stagger: REVEAL_STAGGER_S,
      ease: 'power3.out',
      scrollTrigger: once(el),
    })
  }
  return gsap.from(el, {
    y: REVEAL_RISE_PX,
    opacity: 0,
    duration: REVEAL_DURATION_S,
    ease: 'power3.out',
    scrollTrigger: once(el),
  })
}

function reveal(el: HTMLElement): Cleanup {
  const variant = revealVariant(el.dataset.motionReveal ?? null)
  const items = variant === 'stagger' ? Array.from(el.querySelectorAll('[data-motion-item]')) : []
  if (variant === 'stagger' && items.length === 0) return () => {}
  const restore = keepStyles(variant === 'stagger' ? items : [el])
  const unfocus = showOnFocus(el, enter(el, variant, items))
  return () => {
    unfocus()
    restore()
  }
}

/**
 * `data-motion="reveal"` blocks enter once as they scroll in: `up` (default), `mask` or
 * `stagger`. Opacity and clip only, never visibility, so the content stays readable and focusable
 * before it plays.
 */
export function reveals(root: HTMLElement): Cleanup {
  const cleanups = Array.from(root.querySelectorAll<HTMLElement>('[data-motion="reveal"]')).map(
    reveal,
  )
  return () => cleanups.forEach((cleanup) => cleanup())
}
