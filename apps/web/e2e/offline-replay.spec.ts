import { needsFullUi } from './helpers/full'
import { STORY } from './helpers/story'
import { stepReplay } from './helpers/stepReplay'
import { expect, test } from './helpers/test'
import { SimPage } from './pages/SimPage'

// Rule 6: the worked example replays with the engine asleep (ARCHITECTURE section 16) and, once
// the service worker has cached the build, with no network at all.
const SESSION_PATH = /\/v1\/sessions/

test.describe('API asleep', () => {
  needsFullUi('web-shell (api-status, diagnosis)')

  test('replay completes, never opens an engine session, and says the engine is waking up', async ({
    page,
    engineTraffic,
  }) => {
    const sim = new SimPage(page)
    await sim.goto({ demo: 'worked-example' })
    await expect(sim.apiStatus).toContainText('waking up')
    await stepReplay(sim, 2)
    await expect(sim.diagnosis).toContainText(STORY.diagnosisLabel)
    expect(engineTraffic.requests.map((r) => r.url()).filter((u) => SESSION_PATH.test(u))).toEqual(
      [],
    )
  })
})

test.describe('offline after install', () => {
  // Service workers are blocked everywhere else (playwright.config.ts) so a cached build never
  // answers in place of the server under test.
  test.use({ serviceWorkers: 'allow' })
  // WebKit's service worker support under Playwright's offline emulation is unreliable; the PWA
  // path is checked in Chromium, and on iOS by hand (ADR-0009).
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'service worker check runs in Chromium',
  )

  test('service worker serves the app and the replay completes with the network off', async ({
    page,
    context,
  }) => {
    needsFullUi('web-shell (diagnosis)')
    const sim = new SimPage(page)
    await sim.goto({ demo: 'worked-example' })
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    // registerType 'prompt' does not claim the first page; a reload puts it under the worker.
    await page.reload()
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true)

    await context.setOffline(true)
    await page.reload()
    await expect(sim.heading).toContainText(STORY.toldLabel)
    await stepReplay(sim, 2)
    await expect(sim.diagnosis).toContainText(STORY.diagnosisLabel)
  })
})
