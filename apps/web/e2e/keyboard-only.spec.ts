import type { Page } from '@playwright/test'
import { needsFullUi } from './helpers/full'
import { STORY, WORKED } from './helpers/story'
import { expect, test } from './helpers/test'
import { SimPage } from './pages/SimPage'

// The whole loop without a pointer (ARCHITECTURE section 10). No click, hover or wheel in this
// file: every interaction is page.keyboard (plus locator.focus, which a Tab would also reach).
const QUIET_MS = 2_500
const TOLD_SITE = WORKED.prior_instruction.site
const SITE_COUNT = WORKED.catalog.site_labels.length
/** 0-based sites aimed by the number keys and the placement button in the aim test. */
const KEY_AIM_SITE = 1
const BUTTON_AIM_SITE = 3

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
    await expect(sim.heading).toContainText(STORY.toldLabel)
  })

  // Runs on the Sprint 0 shell: the skip link is already the first stop.
  test('the first Tab stop is the skip link', async ({ page, browserName }) => {
    await blurToBody(page)
    await page.keyboard.press(tabKey(browserName))
    await expect(sim.skipLink).toBeFocused()
  })

  test('? opens the shortcut map, Esc closes it', async ({ page }) => {
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
    await page.keyboard.type(STORY.firstReading)
    await page.keyboard.press('Enter')
    await sim.waitForStep(1)
    await expect(sim.warning).toContainText(STORY.landedLabel)

    // The warning banner takes focus (it is not editable), so single-key shortcuts are live.
    await expect(sim.warning).toBeFocused()
    await page.keyboard.press(']')
    await sim.waitForStep(2)
    await expect(sim.diagnosis).toBeFocused()

    // Decision 6: after a diagnosis, `[` gives one accepted reading and no diagnosis.
    await page.keyboard.press('[')
    await expect(sim.diagnosis).toHaveCount(0)
    await expect(sim.logRows()).toHaveCount(1)

    await blurToBody(page)
    await page.keyboard.press('r')
    await expect(sim.livePolite).toContainText(STORY.toldLabel)

    await blurToBody(page)
    await page.keyboard.press('p')
    await expect(sim.diagnosis).toBeVisible({ timeout: 10_000 })
  })

  // Decision 4: the aimed placement item carries aria-current="true" and the word "aimed".
  test('number keys and placement buttons aim, and aiming submits nothing', async ({ page }) => {
    needsFullUi('web-shell (aim keys, placement buttons)')
    await sim.expectAimed(TOLD_SITE)
    await blurToBody(page)
    await page.keyboard.press(String(KEY_AIM_SITE + 1))
    await sim.expectAimed(KEY_AIM_SITE)
    await page.keyboard.press(String(SITE_COUNT + 1))
    await sim.expectAimed(KEY_AIM_SITE)

    await sim.aimButton(WORKED.catalog.site_labels[BUTTON_AIM_SITE]!).focus()
    await page.keyboard.press('Enter')
    await sim.expectAimed(BUTTON_AIM_SITE)
    await page.waitForTimeout(QUIET_MS)
    await expect(sim.logRows()).toHaveCount(0)
    await expect(sim.heading).toContainText(STORY.toldLabel)
  })

  test('shortcuts are inert while the Keyboard shortcuts dialog is open', async ({ page }) => {
    needsFullUi('web-shell (keyboard map dialog)')
    await blurToBody(page)
    await page.keyboard.press('?')
    await expect(sim.shortcuts).toBeVisible()
    for (const key of [']', 'p', 't', String(KEY_AIM_SITE + 1), 'v']) await page.keyboard.press(key)
    await page.waitForTimeout(QUIET_MS)
    await expect(sim.shortcuts).toBeVisible()
    await expect(sim.voltsInput).not.toBeFocused()
    await sim.expectAimed(TOLD_SITE)

    // Positive check: once the dialog closes, `]` steps exactly once (so none fired above).
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
    for (const key of ['?', ']', 'p', 't', String(KEY_AIM_SITE + 1)]) await page.keyboard.press(key)
    await page.waitForTimeout(QUIET_MS)
    await expect(sim.shortcuts).toBeHidden()
    await expect(sim.voltsInput).not.toBeFocused()
    await sim.expectAimed(TOLD_SITE)

    // Positive check: the Next button still steps, exactly once.
    await sim.next.focus()
    await page.keyboard.press('Enter')
    await sim.waitForStep(1)
  })

  test('shortcuts are ignored inside the reading input and with modifiers held', async ({
    page,
  }) => {
    needsFullUi('web-shell (keyboard guard)')
    // Modifiers: Alt+] must not step and Alt+P must not start autoplay. Positive check: a bare `]`
    // then steps exactly once, and nothing follows it.
    await blurToBody(page)
    await page.keyboard.press('Alt+]')
    await page.keyboard.press('Alt+p')
    await page.keyboard.press(']')
    await sim.waitForStep(1)
    await page.waitForTimeout(QUIET_MS)
    await expect(sim.logRows()).toHaveCount(1)

    // Inside the input the same keys are text, not shortcuts.
    await blurToBody(page)
    await page.keyboard.press('t')
    await expect(sim.voltsInput).toBeFocused()
    for (const key of ['?', 'p', ']', 'v']) await page.keyboard.press(key)
    await expect(sim.shortcuts).toBeHidden()
    await expect(sim.speech).toHaveAttribute('aria-checked', 'false')

    // Positive check: replace whatever the keys typed and submit the second reading. Had `]`
    // fired, the replay would already have used step 2 and this reading would be refused.
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.type(STORY.secondReading)
    await page.keyboard.press('Enter')
    await sim.waitForStep(2)
    await expect(sim.logCell(2, 'reading')).toContainText(STORY.secondReading)
  })
})
