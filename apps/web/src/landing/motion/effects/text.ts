import { gsap } from '../scroll'
import {
  HEADLINE_DELAY_S,
  HEADLINE_LATE_MS,
  HEADLINE_RISE_PERCENT,
  HEADLINE_WORD_DURATION_S,
  HEADLINE_WORD_STAGGER_S,
  QUOTE_LINE_PAUSE_S,
  QUOTE_WORD_DURATION_S,
  QUOTE_WORD_STAGGER_S,
  REVEAL_START,
} from '../constants'
import { groupByLine } from '../helpers'
import { splitWords } from '../split'
import type { Cleanup } from './types'

/**
 * The H1 rises word by word on load. Spans are aria-hidden; the H1 keeps its name through
 * aria-label. Skipped when the motion chunk arrives after the H1 has already been painted for a
 * while: the H1 is on screen from first paint, so time since navigation is how long it has shown.
 */
export function headline(root: HTMLElement): Cleanup {
  if (performance.now() > HEADLINE_LATE_MS) return () => {}
  const el = root.querySelector<HTMLElement>('[data-motion="headline"]')
  const split = el ? splitWords(el, { label: true }) : null
  if (!split) return () => {}
  gsap.from(split.words, {
    yPercent: HEADLINE_RISE_PERCENT,
    autoAlpha: 0,
    duration: HEADLINE_WORD_DURATION_S,
    stagger: HEADLINE_WORD_STAGGER_S,
    delay: HEADLINE_DELAY_S,
    ease: 'power3.out',
  })
  return split.restore
}

/** Delay per word: one beat per word, plus a pause before every new line. */
function typingDelays(words: readonly HTMLElement[]): number[] {
  const lines = groupByLine(words.map((w) => w.offsetTop))
  return lines.map((line, i) => i * QUOTE_WORD_STAGGER_S + line * QUOTE_LINE_PAUSE_S)
}

/**
 * Each quote types itself in, line by line, once as it enters. Opacity only (not visibility) and
 * no aria-hidden: a blockquote or p cannot carry an aria-label, so the words must stay readable.
 */
export function quotes(root: HTMLElement): Cleanup {
  const restores = Array.from(root.querySelectorAll<HTMLElement>('[data-motion="quote"]')).map(
    (el) => {
      const split = splitWords(el, { label: false })
      if (!split) return () => {}
      const delays = typingDelays(split.words)
      gsap.from(split.words, {
        opacity: 0,
        duration: QUOTE_WORD_DURATION_S,
        delay: (i: number) => delays[i] ?? 0,
        ease: 'none',
        scrollTrigger: { trigger: el, start: REVEAL_START, once: true },
      })
      return split.restore
    },
  )
  return () => restores.forEach((restore) => restore())
}
