import { needsFullUi } from './helpers/full'
import { readLiveLog, recordLiveRegions } from './helpers/liveLog'
import { STORY } from './helpers/story'
import { stepReplay } from './helpers/stepReplay'
import { expect, test } from './helpers/test'
import { SimPage } from './pages/SimPage'

// "Your probe is not where you think it is": one event, one banner, one assertive announcement.
// Runs in `chromium` and `chromium-reduced-motion` (DESIGN_REFERENCES F8, F10).
const told = STORY.toldLabel
const likely = STORY.landedLabel

function warningsIn(messages: string[]): string[] {
  return messages.filter((t) => t.includes('Warning.'))
}

test.describe('slip warning', () => {
  let sim: SimPage
  test.beforeEach(async ({ page }) => {
    await recordLiveRegions(page)
    sim = new SimPage(page)
    await sim.goto({ demo: 'worked-example' })
    await expect(sim.next).toBeEnabled()
  })

  // Runs on the Sprint 0 shell too: the announcer and LiveRegion are already on main.
  test('the warning is announced assertively exactly once and names the likely row', async ({
    page,
  }) => {
    await sim.next.click()
    await expect(sim.liveAssertive).toContainText('Warning.')
    await expect(sim.liveAssertive).toContainText(`did not come from ${told}`)
    await expect(sim.liveAssertive).toContainText(likely)
    await expect(sim.next).toBeEnabled()
    await sim.next.click()
    await expect
      .poll(async () => (await readLiveLog(page)).polite.join(' '))
      .toContain(STORY.diagnosisLabel)
    expect(warningsIn((await readLiveLog(page)).assertive)).toHaveLength(1)
  })

  // UI_CONTRACT section 1 "Warning" and section 6 decision 2: the banner is a focusable labelled
  // region, not a live region; #live-assertive (no role) is the only spoken copy.
  test('the banner is a focused "Placement warning" region, mounted once, never an alert', async ({
    page,
  }) => {
    needsFullUi('web-shell (WarningBanner) and main c9b7f53 (assertive region without role)')
    await expect(sim.warning).toHaveCount(0)
    await stepReplay(sim, 1)
    await expect(sim.warning).toHaveCount(1)
    await expect(sim.warningRegion).toHaveAttribute('data-testid', 'warning-banner')
    await expect(sim.warning).toHaveAttribute('tabindex', '-1')
    await expect(sim.warning).toBeFocused()
    await expect(sim.warning).toHaveText(/^\s*Warning\./)
    await expect(sim.warning).toContainText(told)
    await expect(sim.warning).toContainText(likely)
    await expect(sim.warning).not.toHaveAttribute('aria-live', /.+/)
    await expect(sim.warning.locator('[aria-live], [role="alert"], [role="status"]')).toHaveCount(0)
    await expect(sim.liveAssertive).toHaveAttribute('aria-live', 'assertive')
    await expect(sim.liveAssertive).not.toHaveAttribute('role', /.+/)
    await expect(page.getByRole('alert')).toHaveCount(0)

    await stepReplay(sim, 1)
    await expect(sim.diagnosis).toBeVisible()
    const log = await readLiveLog(page)
    expect(log.warningBannerMounts).toBe(1)
    expect(warningsIn(log.assertive)).toHaveLength(1)
  })

  test('the log marks only the slipped step', async () => {
    needsFullUi('web-shell (ReadingLog)')
    await stepReplay(sim, 2)
    const slipped = (await sim.logCell(1, 'warning').textContent())?.trim()
    const clean = (await sim.logCell(2, 'warning').textContent())?.trim()
    expect(slipped).toBeTruthy()
    expect(clean).not.toBe(slipped)
  })
})
