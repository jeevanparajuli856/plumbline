import { needsFullUi } from './helpers/full'
import { expect, test } from './helpers/test'
import { LANDING_SECTION_IDS, LandingPage } from './pages/LandingPage'

// DESIGN_REFERENCES F6, F8, F9: the example never starts on scroll, Play runs it, reduced motion
// (OS setting or the in-page switch) snaps every moment to its final state.
const SNAP_MS = 1_500
const PLAY_RUN_MS = 30_000

let landing: LandingPage
test.beforeEach(async ({ page }) => {
  landing = new LandingPage(page)
  await landing.goto()
})

// Runs on the Sprint 0 shell.
test('the mast carries the promise and links to the simulator', async () => {
  await expect(landing.heading).toHaveText('Measurement you can trust without looking.')
  await expect(landing.openSimulator).toHaveAttribute('href', '/sim')
})

test.describe('landing sections', () => {
  needsFullUi('landing (sections, Play, transcript)')

  test('every section is labelled and has a static, non-live caption', async ({ page }) => {
    for (const id of LANDING_SECTION_IDS) {
      const section = landing.section(id)
      await expect(section).toBeAttached()
      const labelledBy = await section.getAttribute('aria-labelledby')
      expect(labelledBy, `section#${id} aria-labelledby`).toBeTruthy()
      await expect(page.locator(`[id="${labelledBy}"]`)).toBeAttached()
    }
    await expect(landing.captions.first()).toBeAttached()
    for (const caption of await landing.captions.all()) {
      await expect(caption).not.toHaveAttribute('aria-live', /.+/)
      await expect(caption).not.toHaveAttribute('role', /alert|status|log/)
    }
  })

  test('the step-by-step transcript is in the DOM before anything plays', async () => {
    await expect(landing.transcript).toBeAttached()
    expect(await landing.transcript.getByRole('listitem').count()).toBeGreaterThan(0)
  })

  // The transcript always holds the whole story, so "playing" is read from the controls (F9;
  // UI_CONTRACT section 6, decision 3: exact names "Pause" and "Replay"), not from text.
  test('scrolling never starts the example', async ({ page }) => {
    await landing.scrollThrough()
    await landing.play.scrollIntoViewIfNeeded()
    await page.waitForTimeout(SNAP_MS)
    await expect(landing.play).toBeVisible()
    await expect(
      landing.section('play').getByRole('button', { name: /^(Pause|Replay)$/ }),
    ).toHaveCount(0)
  })

  test('Play runs the example to its end', async () => {
    await landing.play.click()
    const play = landing.section('play')
    await expect(play.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
    await expect(play.getByRole('button', { name: 'Replay', exact: true })).toBeVisible({
      timeout: PLAY_RUN_MS,
    })
  })

  test('reduced motion snaps the example to its final state', async ({ page }) => {
    needsFullUi('web-shell (app-wide Reduce motion switch in the Display bar)')
    const osReduced = await page.evaluate(
      () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    )
    if (!osReduced) await landing.reduceMotion.click()
    await expect(landing.reduceMotion).toHaveAttribute('aria-checked', 'true')
    await landing.play.click()
    await expect(
      landing.section('play').getByRole('button', { name: 'Replay', exact: true }),
    ).toBeVisible({
      timeout: SNAP_MS,
    })
  })
})
