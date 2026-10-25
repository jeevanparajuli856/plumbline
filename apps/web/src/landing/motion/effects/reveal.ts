import { gsap } from '../scroll'
import {
  REVEAL_START,
  ROWS_DURATION_S,
  ROWS_OFFSET_PX,
  ROWS_STAGGER_S,
  STAT_DURATION_S,
} from '../constants'
import { formatStat, parseStat } from '../helpers'
import { keepStyles } from './styles'
import type { Cleanup } from './types'

/** Direct li children of each product list slide in from the left, once. */
export function rows(root: HTMLElement): Cleanup {
  const lists = Array.from(root.querySelectorAll<HTMLElement>('[data-motion="rows"]')).map(
    (list) => ({
      list,
      items: Array.from(list.children).filter((child) => child.tagName === 'LI'),
    }),
  )
  const restore = keepStyles(lists.flatMap(({ items }) => items))
  lists.forEach(({ list, items }) => {
    if (items.length === 0) return
    gsap.from(items, {
      x: -ROWS_OFFSET_PX,
      autoAlpha: 0,
      duration: ROWS_DURATION_S,
      stagger: ROWS_STAGGER_S,
      ease: 'power2.out',
      scrollTrigger: { trigger: list, start: REVEAL_START, once: true },
    })
  })
  return restore
}

/** One stat counts from 0 to its value and ends on exactly its original text. */
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
    ease: 'power2.out',
    onUpdate: () => {
      el.textContent = formatStat(counter.value, spec)
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
