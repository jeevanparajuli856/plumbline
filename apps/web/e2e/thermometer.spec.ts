import type { Page } from '@playwright/test'
import { needsFullUi } from './helpers/full'
import { expect, test } from './helpers/test'
import { SimPage } from './pages/SimPage'

// Rule 1: the thermometer is a simulated model and says so for the whole session, not only at
// the start. A MutationObserver records any moment the badge leaves the DOM after it first shows.
const MAX_STEPS = 6

declare global {
  interface Window {
    __e2eBadge?: { seen: boolean; gaps: number }
  }
}

async function watchSimulatedBadge(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const state = { seen: false, gaps: 0 }
    window.__e2eBadge = state
    const check = () => {
      const present = Array.from(document.querySelectorAll('[data-testid="badge"]')).some((el) =>
        el.textContent?.includes('SIMULATED'),
      )
      if (present) state.seen = true
      else if (state.seen) state.gaps += 1
    }
    new MutationObserver(check).observe(document, {
      subtree: true,
      childList: true,
      characterData: true,
    })
  })
}

test.describe('thermometer (simulated)', () => {
  needsFullUi('engine (thermometer_demo fixture) and web-shell (badges, Celsius input)')

  test('SIMULATED badge is visible from the first frame to the last step', async ({ page }) => {
    await watchSimulatedBadge(page)
    const sim = new SimPage(page)
    await sim.goto({ domain: 'thermometer', mode: 'replay', fixture: 'thermometer_demo' })
    await expect(sim.badge('SIMULATED').first()).toBeVisible()
    await expect(
      sim.instrumentGroup.getByRole('radio', { name: 'Thermometer (simulated)' }),
    ).toBeChecked()
    await expect(sim.celsiusInput).toBeVisible()

    for (let step = 1; step <= MAX_STEPS; step += 1) {
      if ((await sim.diagnosis.count()) > 0 || (await sim.unresolved.count()) > 0) break
      await sim.next.click()
      await sim.waitForStep(step)
      await expect(sim.badge('SIMULATED').first()).toBeVisible()
    }
    await expect(sim.diagnosis.or(sim.unresolved)).toBeVisible()
    await expect(sim.badge('SIMULATED').first()).toBeVisible()
    expect(await page.evaluate(() => window.__e2eBadge)).toEqual({ seen: true, gaps: 0 })
  })
})
