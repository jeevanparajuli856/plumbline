import { gsap } from '../scroll'
import {
  BARS_SCROLL_LENGTH,
  BARS_SCRUB_S,
  BARS_SLAM_DURATION,
  BARS_SPREAD_DURATION,
} from '../constants'
import { parseStages, type Stages } from '../helpers'
import { keepStyles } from './styles'
import type { Cleanup } from './types'

interface Bar {
  el: HTMLElement
  stages: Stages
  isPublished: boolean
}

interface BarsOptions {
  pin: boolean
}

function readBars(container: HTMLElement): Bar[] | null {
  const els = Array.from(container.querySelectorAll<HTMLElement>('[data-motion-bar]'))
  const bars = els.map((el) => ({
    el,
    stages: parseStages(el.getAttribute('data-motion-stages')),
    isPublished: el.dataset.motionBar === 'published',
  }))
  if (bars.length === 0 || bars.some((b) => b.stages === null)) return null
  return bars as Bar[]
}

/** Shows only the label whose `data-motion-stage-label` equals the stage, at that point of the timeline. */
function swapLabels(tl: gsap.core.Timeline, labels: readonly HTMLElement[]): void {
  if (labels.length === 0) return
  ;[0, 1, 2].forEach((stage) => {
    const at = stage === 0 ? 0 : stage - 1 + BARS_SLAM_DURATION
    tl.set(
      labels,
      {
        autoAlpha: (_i: number, el: HTMLElement) =>
          el.dataset.motionStageLabel === String(stage) ? 1 : 0,
      },
      at,
    )
  })
}

/**
 * The technology race: the published bar slams to its stage-1 value, ours spreads, then the second
 * reading lands and ours resolves. Scrubbed by scroll; pinned on wide screens. Bad stages: no motion.
 */
export function bars(root: HTMLElement, { pin }: BarsOptions): Cleanup {
  const container = root.querySelector<HTMLElement>('[data-motion="bars"]')
  const parsed = container ? readBars(container) : null
  if (!container || !parsed) return () => {}
  const section = container.closest('section') ?? container
  const labels = Array.from(container.querySelectorAll<HTMLElement>('[data-motion-stage-label]'))
  const restore = keepStyles([section, ...parsed.map((b) => b.el), ...labels])

  const tl = gsap.timeline({
    defaults: { transformOrigin: 'left center' },
    scrollTrigger: {
      trigger: section,
      start: pin ? 'top top' : 'top 75%',
      end: pin ? BARS_SCROLL_LENGTH : 'bottom 25%',
      scrub: BARS_SCRUB_S,
      pin: pin ? section : false,
    },
  })
  parsed.forEach(({ el, stages: [p0, p1, p2], isPublished }) => {
    const duration = isPublished ? BARS_SLAM_DURATION : BARS_SPREAD_DURATION
    const ease = isPublished ? 'expo.out' : 'sine.inOut'
    tl.fromTo(el, { scaleX: p0 }, { scaleX: p1, duration, ease }, 0)
    tl.to(el, { scaleX: p2, duration, ease }, 1)
  })
  swapLabels(tl, labels)
  return restore
}
