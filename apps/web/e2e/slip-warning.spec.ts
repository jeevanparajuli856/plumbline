import { needsFullUi } from './helpers/full'
import { readFixture, siteLabel, type FixtureFile } from './helpers/fixture'
import { readLiveLog, recordLiveRegions } from './helpers/liveLog'
import { stepReplay } from './helpers/stepReplay'
import { expect, test } from './helpers/test'
import { SimPage } from './pages/SimPage'

// "Your probe is not where you think it is": one event, one banner, one assertive announcement.
// Runs in `chromium` and `chromium-reduced-motion` (DESIGN_REFERENCES F8, F10).
const fixture = readFixture('worked_example') as FixtureFile
const slip = fixture.steps[0]!
const told = siteLabel(fixture, slip.told_site)
const likely = siteLabel(fixture, slip.landed_site!)

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
    await expect(sim.liveAssertive).toBeAttached()
    await expect
      .poll(async () => (await readLiveLog(page)).polite.join(' '))
      .toContain('ten times too small')
    const log = await readLiveLog(page)
    expect(log.assertive.filter((t) => t.startsWith('Warning.'))).toHaveLength(1)
  })

  test('the banner is a role=alert, appears once, and names told and likely rows', async ({
    page,
  }) => {
    needsFullUi('web-shell (WarningBanner)')
    await expect(sim.warning).toHaveCount(0)
    await stepReplay(sim, 1)
    await expect(sim.warning).toHaveCount(1)
    await expect(sim.warning).toHaveAttribute('role', 'alert')
    await expect(sim.warning).toHaveText(/^\s*Warning\./)
    await expect(sim.warning).toContainText(told)
    await expect(sim.warning).toContainText(likely)

    await stepReplay(sim, 1)
    await expect(sim.diagnosis).toBeVisible()
    expect((await readLiveLog(page)).warningBannerMounts).toBe(1)
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
