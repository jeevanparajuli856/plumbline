import { gsap, ScrollTrigger } from '../scroll'
import {
  SLIDE_S,
  WOBBLE_SETTLE_S,
  WOBBLE_X_PERCENT,
  WOBBLE_X_PERIOD_S,
  WOBBLE_Y_PERCENT,
  WOBBLE_Y_PERIOD_S,
} from '../constants'
import { slideOffset, wobbleAmplitude } from '../helpers'
import { useLanding } from '@/state/landing'
import { keepStyles } from './styles'
import type { Cleanup } from './types'

interface ColumnLayout {
  holes: number[]
  rest: number
}

function centreY(rect: DOMRect): number {
  return rect.top + rect.height / 2
}

/** Hole centres and the dot's resting centre, both from the column's top. Read without the slide. */
function measure(column: Element, holes: Element | null, dot: Element): ColumnLayout {
  const top = column.getBoundingClientRect().top
  const slid = Number(gsap.getProperty(dot, 'y')) || 0
  return {
    holes: holes
      ? Array.from(holes.children, (hole) => centreY(hole.getBoundingClientRect()) - top)
      : [],
    rest: centreY(dot.getBoundingClientRect()) - slid - top,
  }
}

/** One axis of the wobble: a smooth unit sway scaled by the current amplitude. */
function wobble(
  dot: Element,
  axis: 'xPercent' | 'yPercent',
  reach: number,
  period: number,
  level: { value: number },
): void {
  gsap.fromTo(
    dot,
    { [axis]: -1 },
    {
      [axis]: 1,
      duration: period / 2,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      modifiers: { [axis]: gsap.utils.unitize((unit: number) => unit * reach * level.value) },
    },
  )
}

/**
 * The edge cell column. The ringed dot glides to the hole that matches the reader's place on the
 * page, and wobbles toward its neighbours until `useLanding.progress` says the reading has settled.
 * The store is read by subscription, so nothing re-renders. The column is fixed to the page edge,
 * so it may sit outside the motion root.
 */
export function column(root: HTMLElement): Cleanup {
  const selector = '[data-motion="plumb"]'
  const el =
    root.querySelector<HTMLElement>(selector) ?? document.querySelector<HTMLElement>(selector)
  const dot = el?.querySelector<HTMLElement>('[data-motion-bob]')
  if (!el || !dot) return () => {}
  const holes = el.querySelector('[data-motion-string]')
  const restore = keepStyles([dot])

  let layout = measure(el, holes, dot)
  const slideTo = gsap.quickTo(dot, 'y', { duration: SLIDE_S, ease: 'power2.out' })
  const trigger = ScrollTrigger.create({
    start: 0,
    end: 'max',
    onRefresh: (self) => {
      layout = measure(el, holes, dot)
      slideTo(slideOffset(self.progress, layout.holes, layout.rest))
    },
    onUpdate: (self) => slideTo(slideOffset(self.progress, layout.holes, layout.rest)),
  })
  slideTo(slideOffset(trigger.progress, layout.holes, layout.rest))

  const level = { value: wobbleAmplitude(useLanding.getState().progress) }
  const settleTo = gsap.quickTo(level, 'value', { duration: WOBBLE_SETTLE_S, ease: 'sine.out' })
  const unsubscribe = useLanding.subscribe((state) => settleTo(wobbleAmplitude(state.progress)))
  wobble(dot, 'xPercent', WOBBLE_X_PERCENT, WOBBLE_X_PERIOD_S, level)
  wobble(dot, 'yPercent', WOBBLE_Y_PERCENT, WOBBLE_Y_PERIOD_S, level)

  return () => {
    unsubscribe()
    restore()
  }
}
