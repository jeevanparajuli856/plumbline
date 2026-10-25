import { act, render } from '@testing-library/react'
import { gsap } from '../scroll'
import { Fixture } from './Fixture'

/** The page's final state: the same DOM with no motion mounted. */
export function staticHtml(stages?: string): string {
  const { container, unmount } = render(<Fixture stages={stages} withMotion={false} />)
  const html = container.innerHTML
  unmount()
  return html
}

/** Tweens we created. ScrollTrigger's own delayedCalls (their target is a function) do not count. */
export function liveTweens() {
  return gsap.globalTimeline
    .getChildren(true, true, true)
    .filter((t) => !(t instanceof gsap.core.Tween && typeof t.targets()[0] === 'function'))
}

export function topLevelAnimations() {
  return gsap.globalTimeline
    .getChildren(false, true, true)
    .filter((t) => !(t instanceof gsap.core.Tween && typeof t.targets()[0] === 'function'))
}

export function spyCreators() {
  return [
    vi.spyOn(gsap, 'to'),
    vi.spyOn(gsap, 'from'),
    vi.spyOn(gsap, 'fromTo'),
    vi.spyOn(gsap, 'timeline'),
    vi.spyOn(gsap, 'set'),
  ]
}

export function totalCalls(spies: ReturnType<typeof spyCreators>): number {
  return spies.reduce((sum, spy) => sum + spy.mock.calls.length, 0)
}

export async function setReduceMotion(on: boolean): Promise<void> {
  await act(async () => {
    if (on) document.documentElement.dataset.reduceMotion = 'true'
    else delete document.documentElement.dataset.reduceMotion
    await Promise.resolve()
  })
}

/** Tweens (not timelines) whose first target is `el`. */
export function tweensOf(el: Element) {
  return topLevelAnimations().filter(
    (t): t is gsap.core.Tween => t instanceof gsap.core.Tween && t.targets()[0] === el,
  )
}
