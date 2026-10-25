import { gsap } from '../scroll'
import { SWING_EASE_PER_FRAME, SWING_PERIOD_S } from '../constants'
import { swingAmplitude } from '../helpers'
import { useLanding } from '@/state/landing'
import { keepStyles } from './styles'
import type { Cleanup } from './types'

/** Bob travel: the whole line minus the bob itself. */
function travel(line: HTMLElement, bob: HTMLElement): number {
  return Math.max(0, line.clientHeight - bob.offsetHeight)
}

/**
 * The edge plumb line. The bob slides down the line as the page scrolls; the line swings about its
 * top, and the swing settles as `useLanding.progress` rises. The store is read by subscription, so
 * nothing re-renders. The line is fixed to the page edge, so it may sit outside the motion root.
 */
export function plumb(root: HTMLElement): Cleanup {
  const selector = '[data-motion="plumb"]'
  const line =
    root.querySelector<HTMLElement>(selector) ?? document.querySelector<HTMLElement>(selector)
  if (!line) return () => {}

  const bob = line.querySelector<HTMLElement>('[data-motion-bob]')
  const restore = keepStyles(bob ? [line, bob] : [line])
  if (bob) {
    gsap.fromTo(
      bob,
      { y: 0 },
      {
        y: () => travel(line, bob),
        ease: 'none',
        scrollTrigger: { start: 0, end: 'max', scrub: true, invalidateOnRefresh: true },
      },
    )
  }

  let target = swingAmplitude(useLanding.getState().progress)
  let amplitude = target
  const unsubscribe = useLanding.subscribe((state) => {
    target = swingAmplitude(state.progress)
  })
  // A unit swing (-1..1 degrees) scaled each frame by the current amplitude.
  gsap.set(line, { transformOrigin: '50% 0%' })
  gsap.fromTo(
    line,
    { rotation: -1 },
    {
      rotation: 1,
      duration: SWING_PERIOD_S / 2,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      modifiers: {
        rotation: gsap.utils.unitize((unit: number) => {
          amplitude += (target - amplitude) * SWING_EASE_PER_FRAME
          return unit * amplitude
        }),
      },
    },
  )
  return () => {
    unsubscribe()
    restore()
  }
}
