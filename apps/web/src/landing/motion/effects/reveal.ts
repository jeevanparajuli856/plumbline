import { gsap } from '../scroll'
import {
  REVEAL_START,
  ROWS_DURATION_S,
  ROWS_OFFSET_PX,
  ROWS_STAGGER_S,
  STAT_DURATION_S,
  STAT_EASE,
} from '../constants'
import { clampCount, formatStat, parseStat } from '../helpers'
import { showOnFocus } from './focus'
import { keepStyles } from './styles'
import type { Cleanup } from './types'

/** Direct li children of each product list slide and fade in from the left, once, in sequence. */
export function rows(root: HTMLElement): Cleanup {
  const lists = Array.from(root.querySelectorAll<HTMLElement>('[data-motion="rows"]')).map(
    (list) => ({
      list,
      items: Array.from(list.children).filter((child) => child.tagName === 'LI'),
    }),
  )
  const restore = keepStyles(lists.flatMap(({ items }) => items))
  const unfocus = lists.map(({ list, items }) => {
    if (items.length === 0) return () => {}
    const tween = gsap.from(items, {
      x: -ROWS_OFFSET_PX,
      opacity: 0,
      duration: ROWS_DURATION_S,
      stagger: ROWS_STAGGER_S,
      ease: 'power2.out',
      scrollTrigger: { trigger: list, start: REVEAL_START, once: true },
    })
    return showOnFocus(list, tween)
  })
  return () => {
    unfocus.forEach((cleanup) => cleanup())
    restore()
  }
}

/**
 * One stat counts from 0 to its value and ends on exactly its original text. The ease overshoots
 * for life, but the shown number is clamped: it never claims more than was measured.
 */
function countUp(el: HTMLElement): Cleanup {
  const spec = parseStat(
    el.dataset.motionValue ?? null,
    el.dataset.motionDecimals ?? null,
    el.dataset.motionSuffix ?? null,
  )
  if (!spec) return () => {}
  const original = el.textContent ?? ''
  const counter = { value: 0 }
  el.textContent = formatStat(0, spec)
  gsap.to(counter, {
    value: spec.value,
    duration: STAT_DURATION_S,
    ease: STAT_EASE,
    onUpdate: () => {
      el.textContent = formatStat(clampCount(counter.value, spec.value), spec)
    },
    onComplete: () => {
      el.textContent = original
    },
    scrollTrigger: { trigger: el, start: REVEAL_START, once: true },
  })
  return () => {
    el.textContent = original
  }
}

/** Validation stats count up once. Their sr-only twins are static, so the text change is visual only. */
export function stats(root: HTMLElement): Cleanup {
  const restores = Array.from(root.querySelectorAll<HTMLElement>('[data-motion="stat"]')).map(
    countUp,
  )
  return () => restores.forEach((restore) => restore())
}
