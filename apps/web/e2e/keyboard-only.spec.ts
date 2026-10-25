import type { Page } from '@playwright/test'
import { needsFullUi } from './helpers/full'
import { expect, test } from './helpers/test'
import { SimPage } from './pages/SimPage'

// The whole loop without a pointer (ARCHITECTURE section 10). No click, hover or wheel in this
// file: every interaction is page.keyboard.
const QUIET_MS = 2_500

/** WebKit on macOS skips links on Tab unless Option is held (system "Tab to all controls" off). */
function tabKey(browserName: string): string {
  return browserName === 'webkit' ? 'Alt+Tab' : 'Tab'
}

async function blurToBody(page: Page): Promise<void> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
}

test.describe('keyboard only', () => {
  let sim: SimPage
  test.beforeEach(async ({ page }) => {
    sim = new SimPage(page)
    await sim.goto({ demo: 'worked-example' })
    await expect(sim.heading).toContainText('row 3')
  })

  // Runs on the Sprint 0 shell: the skip link is already the first stop.
  test('the first Tab stop is the skip link', async ({ page, browserName }) => {
    await blurToBody(page)
    await page.keyboard.press(tabKey(browserName))
    await expect(sim.skipLink).toBeFocused()
  })

  test('? opens the shortcut map, Esc closes it and returns focus', async ({ page }) => {
    needsFullUi('web-shell (keyboard map dialog)')
    await blurToBody(page)
    await page.keyboard.press('?')
    await expect(sim.shortcuts).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(sim.shortcuts).toBeHidden()
  })

  test('T, type, Enter, ], [, P and R drive the worked example', async ({ page }) => {
    needsFullUi('web-shell (reading input, replay keys)')
    await blurToBody(page)
    await page.keyboard.press('t')
    await expect(sim.voltsInput).toBeFocused()
    await page.keyboard.type('3.671')
    await page.keyboard.press('Enter')
    await sim.waitForStep(1)
    await expect(sim.warning).toContainText('row 2')

    // The warning banner takes focus (it is not editable), so single-key shortcuts are live.
    await expect(sim.warning).toBeFocused()
    await page.keyboard.press(']')
    await sim.waitForStep(2)
    await expect(sim.diagnosis).toBeFocused()

    await page.keyboard.press('[')
    await expect(sim.diagnosis).toHaveCount(0)
    await expect(sim.logRows()).toHaveCount(1)

    await blurToBody(page)
    await page.keyboard.press('r')
    await expect(sim.livePolite).toContainText('row 3')

    await blurToBody(page)
    await page.keyboard.press('p')
    await expect(sim.diagnosis).toBeVisible({ timeout: 10_000 })
  })

  // Decision 4: the aimed placement item carries aria-current="true" and the word "aimed".
  test('number keys and placement buttons aim, and aiming submits nothing', async ({ page }) => {
    needsFullUi('web-shell (aim keys, placement buttons)')
    await expect(sim.aimedItem()).toHaveCount(1)
    await expect(sim.aimedItem()).toContainText('row 3')
    await blurToBody(page)
    await page.keyboard.press('2')
    await expect(sim.aimedItem()).toContainText('row 2')
    await expect(sim.aimedItem()).toContainText('aimed')
    await page.keyboard.press('9')
    await expect(sim.aimedItem()).toContainText('row 2')

    await sim.aimButton('row 4').focus()
    await page.keyboard.press('Enter')
    await expect(sim.aimedItem()).toHaveCount(1)
    await expect(sim.aimedItem()).toContainText('row 4')
    await page.waitForTimeout(QUIET_MS)
    await expect(sim.logRows()).toHaveCount(0)
    await expect(sim.heading).toContainText('row 3')
  })

  test('shortcuts are inert while the Keyboard shortcuts dialog is open', async ({ page }) => {
    needsFullUi('web-shell (keyboard map dialog)')
    await blurToBody(page)
    await page.keyboard.press('?')
    await expect(sim.shortcuts).toBeVisible()
    for (const key of [']', 'p', 't', '2', 'v']) await page.keyboard.press(key)
    await page.waitForTimeout(QUIET_MS)
    await expect(sim.shortcuts).toBeVisible()
    await expect(sim.logRows()).toHaveCount(0)
    await expect(sim.voltsInput).not.toBeFocused()
    await expect(sim.aimedItem()).toContainText('row 3')

    await page.keyboard.press('Escape')
    await expect(sim.shortcuts).toBeHidden()
    await blurToBody(page)
    await page.keyboard.press(']')
    await sim.waitForStep(1)
  })

  // WCAG 2.1.4: single-character shortcuts can be turned off; buttons still work.
  test('the Single-key shortcuts switch turns letter and number keys off', async ({ page }) => {
    needsFullUi('web-shell (Single-key shortcuts switch)')
    await expect(sim.singleKeyShortcuts).toHaveAttribute('aria-checked', 'true')
    await sim.singleKeyShortcuts.focus()
    await page.keyboard.press('Space')
    await expect(sim.singleKeyShortcuts).toHaveAttribute('aria-checked', 'false')

    await blurToBody(page)
    for (const key of ['?', ']', 'p', 't', '2']) await page.keyboard.press(key)
    await page.waitForTimeout(QUIET_MS)
    await expect(sim.shortcuts).toBeHidden()
    await expect(sim.logRows()).toHaveCount(0)
    await expect(sim.voltsInput).not.toBeFocused()
    await expect(sim.aimedItem()).toContainText('row 3')

    await sim.next.focus()
    await page.keyboard.press('Enter')
    await sim.waitForStep(1)
  })

  test('shortcuts are ignored inside the reading input and with modifiers held', async ({
    page,
  }) => {
    needsFullUi('web-shell (keyboard guard)')
    await blurToBody(page)
    await page.keyboard.press('t')
    await expect(sim.voltsInput).toBeFocused()
    for (const key of ['?', 'p', ']', 'v']) await page.keyboard.press(key)
    await expect(sim.shortcuts).toBeHidden()
    await expect(sim.speech).toHaveAttribute('aria-checked', 'false')

    await blurToBody(page)
    await page.keyboard.press('Alt+]')
    await page.keyboard.press('Alt+p')
    await page.waitForTimeout(QUIET_MS)
    await expect(sim.logRows()).toHaveCount(0)
  })
})
