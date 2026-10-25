import { describe, expect, it } from 'vitest'
import { loadFixture, stepViewFromFixture } from './replay'

describe('stepViewFromFixture', () => {
  it('uses the gains computed before the step even when the told site differs from the engine choice', async () => {
    const fx = await loadFixture('worked_example')
    const first = fx.steps[0]!
    const second = fx.steps[1]!
    const told = { ...second, told_site: (first.engine_choice.site + 1) % fx.catalog.site_labels.length }
    const altered = { ...fx, steps: [first, told, ...fx.steps.slice(2)] }
    const view = stepViewFromFixture(altered, 1)
    expect(view.instruction.site).toBe(told.told_site)
    expect(view.instruction.gain_bits).toEqual(first.engine_choice.gain_bits)
  })

  it('uses the prior instruction gains for the first step', async () => {
    const fx = await loadFixture('worked_example')
    expect(stepViewFromFixture(fx, 0).instruction.gain_bits).toEqual(fx.prior_instruction.gain_bits)
  })
})
