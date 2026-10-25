import { disableWebGL } from './helpers/disableWebGL'
import { needsFullUi } from './helpers/full'
import { stepReplay } from './helpers/stepReplay'
import { expect, test } from './helpers/test'
import { LandingPage } from './pages/LandingPage'
import { SimPage } from './pages/SimPage'

// Rule 4: the scene is for sighted judges; the text channel is the product. Without WebGL (or
// with `view=text`) every piece of information is still on the page and the replay completes.

test.describe('no WebGL', () => {
  needsFullUi('web-shell (/sim panels) and landing (sections)')

  test.beforeEach(async ({ page }) => {
    await disableWebGL(page)
  })

  test('/sim keeps every text panel and the replay completes', async ({ page }) => {
    const sim = new SimPage(page)
    await sim.goto({ demo: 'worked-example' })
    await expect(page.locator('canvas')).toHaveCount(0)
    await expect(sim.instruction).toContainText('row 3')
    await expect(sim.voltsInput).toBeVisible()
    await expect(sim.beliefTable).toBeVisible()
    await expect(sim.placementStrip).toBeVisible()
    await expect(sim.readingLog).toBeVisible()
    await stepReplay(sim, 1)
    await expect(sim.warning).toContainText('row 2')
    await expect(sim.logCell(1, 'landed')).toHaveText('row 2')
    await stepReplay(sim, 1)
    await expect(sim.diagnosis).toContainText('R3 is ten times too small')
  })

  test('landing reads fully without the canvas', async ({ page }) => {
    const landing = new LandingPage(page)
    await landing.goto()
    await expect(page.locator('canvas')).toHaveCount(0)
    await expect(landing.heading).toHaveText('Measurement you can trust without looking.')
    await expect(landing.transcript).toBeAttached()
    await expect(landing.play).toBeVisible()
  })
})

test.describe('text-only view', () => {
  needsFullUi('web-shell (Text only switch, view=text)')

  test('view=text mounts no scene and the replay completes', async ({ page }) => {
    const sim = new SimPage(page)
    await sim.goto({ demo: 'worked-example', view: 'text' })
    await expect(sim.textOnly).toHaveAttribute('aria-checked', 'true')
    await expect(sim.scene).toHaveCount(0)
    await expect(page.locator('canvas')).toHaveCount(0)
    await stepReplay(sim, 2)
    await expect(sim.diagnosis).toContainText('R3 is ten times too small')
  })
})
