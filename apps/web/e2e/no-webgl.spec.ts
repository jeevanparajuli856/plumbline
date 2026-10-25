import type { Page } from '@playwright/test'
import { disableWebGL } from './helpers/disableWebGL'
import { needsFullUi } from './helpers/full'
import { STORY } from './helpers/story'
import { stepReplay } from './helpers/stepReplay'
import { expect, test } from './helpers/test'
import { LandingPage } from './pages/LandingPage'
import { SimPage } from './pages/SimPage'

/** Uncaught page errors; a missing GPU must degrade to text, never throw. */
function collectPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

// Rule 4: the scene is for sighted judges; the text channel is the product. Without WebGL (or
// with `view=text`) every piece of information is still on the page and the replay completes.

test.describe('no WebGL', () => {
  needsFullUi('web-shell (/sim panels) and landing (sections)')

  test.beforeEach(async ({ page }) => {
    await disableWebGL(page)
  })

  test('/sim keeps every text panel and the replay completes', async ({ page }) => {
    const errors = collectPageErrors(page)
    const sim = new SimPage(page)
    await sim.goto({ demo: 'worked-example' })
    await expect(page.locator('canvas')).toHaveCount(0)
    await expect(sim.instruction).toContainText(STORY.toldLabel)
    await expect(sim.voltsInput).toBeVisible()
    await expect(sim.beliefTable).toBeVisible()
    await expect(sim.placementStrip).toBeVisible()
    await expect(sim.readingLog).toBeVisible()
    await stepReplay(sim, 1)
    await expect(sim.warning).toContainText(STORY.landedLabel)
    await expect(sim.logCell(1, 'landed')).toHaveText(STORY.landedLabel)
    await stepReplay(sim, 1)
    await expect(sim.diagnosis).toContainText(STORY.diagnosisLabel)
    await expect(page.locator('canvas')).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('landing reads fully without the canvas', async ({ page }) => {
    const errors = collectPageErrors(page)
    const landing = new LandingPage(page)
    await landing.goto()
    await expect(page.locator('canvas')).toHaveCount(0)
    await expect(landing.heading).toHaveText('Measurement you can trust without looking.')
    await expect(landing.section('cta')).toBeAttached()
    await landing.gotoHowItWorks()
    await expect(page.locator('canvas')).toHaveCount(0)
    await expect(landing.transcript).toBeAttached()
    await expect(landing.play).toBeVisible()
    expect(errors).toEqual([])
  })
})

test.describe('text-only view', () => {
  needsFullUi('web-shell (Text only switch, view=text)')

  test('view=text mounts no scene and the replay completes', async ({ page }) => {
    const errors = collectPageErrors(page)
    const sim = new SimPage(page)
    await sim.goto({ demo: 'worked-example', view: 'text' })
    // view=text forces the text view for this visit; the saved Text only switch is untouched.
    await expect(sim.heading).toBeVisible()
    await expect(page.locator('#scene-slot')).toHaveCount(0)
    await expect(sim.scene).toHaveCount(0)
    await expect(page.locator('canvas')).toHaveCount(0)
    await stepReplay(sim, 2)
    await expect(sim.diagnosis).toContainText(STORY.diagnosisLabel)
    expect(errors).toEqual([])
  })
})
