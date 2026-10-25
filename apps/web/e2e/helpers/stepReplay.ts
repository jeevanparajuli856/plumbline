import type { SimPage } from '../pages/SimPage'

export type StepVia = 'button' | 'key'

/**
 * Advances a replay by `count` recorded readings, waiting for each to finish its reveal.
 * `key` presses `]` (focus must not be in an input); `button` activates "Next recorded reading".
 */
export async function stepReplay(
  sim: SimPage,
  count: number,
  via: StepVia = 'button',
): Promise<void> {
  const already = await sim.logRows().count()
  for (let i = 1; i <= count; i += 1) {
    if (via === 'key') await sim.page.keyboard.press(']')
    else await sim.next.click()
    await sim.waitForStep(already + i)
  }
}
