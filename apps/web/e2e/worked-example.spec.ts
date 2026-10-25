import { needsFullUi } from './helpers/full'
import { isProvisional, labelOf, readFixture, siteLabel, type FixtureFile } from './helpers/fixture'
import { stepReplay } from './helpers/stepReplay'
import { expect, test } from './helpers/test'
import { SimPage } from './pages/SimPage'

// The story (rule 6): true fault R3 ten times too small, told row 3, the hand lands on row 2 and
// reads 3.671 V, Plumbline warns, the second reading 0.338 V resolves it. Expected values come
// from the same fixture the app replays, never typed from the brief.
const fixture = readFixture('worked_example') as FixtureFile
const [first, second] = fixture.steps
const DIAGNOSIS_FLOOR = 0.95
const PERCENT = /(\d+(?:\.\d+)?)\s*%/

test('the fixture is the worked example', () => {
  expect(first!.told_site).toBe(2)
  expect(first!.reading).toBeCloseTo(3.671, 3)
  expect(first!.landed_site).toBe(1)
  expect(first!.warning).toBe(true)
  expect(second!.reading).toBeCloseTo(0.338, 3)
  expect(second!.diagnosis?.hypothesis_id).toBe('R3_10x_low')
  expect(second!.diagnosis!.confidence).toBeGreaterThan(DIAGNOSIS_FLOOR)
})

test.describe('worked example replay', () => {
  needsFullUi('web-shell (/sim panels)')

  let sim: SimPage
  test.beforeEach(async ({ page }) => {
    sim = new SimPage(page)
    await sim.goto({ demo: 'worked-example' })
    await expect(sim.instruction).toContainText(siteLabel(fixture, fixture.prior_instruction.site))
  })

  test('typed readings: warns about row 2, then diagnoses R3 ten times too small', async () => {
    await expect(sim.heading).toContainText('row 3')
    await expect(sim.logRows()).toHaveCount(0)

    await sim.submitReading(sim.voltsInput, '3.671')
    await sim.waitForStep(1)
    await expect(sim.logCell(1, 'told')).toHaveText('row 3')
    await expect(sim.logCell(1, 'reading')).toContainText('3.671')
    await expect(sim.logCell(1, 'landed')).toHaveText(siteLabel(fixture, first!.landed_site!))
    await expect(sim.warning).toHaveAttribute('role', 'alert')
    await expect(sim.warning).toHaveText(/^\s*Warning\./)
    await expect(sim.warning).toContainText('row 2')
    await expect(sim.diagnosis).toHaveCount(0)

    // The published method trusts the told row and is already certain of the wrong fault.
    await expect(sim.beliefFigure).toContainText('Published method')
    await expect(sim.beliefFigure).toContainText(labelOf(fixture, first!.baseline.top))

    await sim.submitReading(sim.voltsInput, '0.338')
    await sim.waitForStep(2)
    await expectResolved(sim)
  })

  test('replay button: same story without typing', async () => {
    await stepReplay(sim, 1)
    await expect(sim.warning).toContainText('row 2')
    await stepReplay(sim, 1)
    await expectResolved(sim)
  })

  test('landed row stays hidden until the reading is accepted', async () => {
    await expect(sim.logRows()).toHaveCount(0)
    await expect(sim.placementStrip.getByRole('listitem')).toHaveCount(
      fixture.catalog.site_labels.length,
    )
    await sim.next.click()
    await expect(sim.logRows()).toHaveCount(1)
    await expect(sim.logCell(1, 'landed')).toHaveText(/hidden|row 2/)
    await expect(sim.logCell(1, 'landed')).toHaveText('row 2', { timeout: 5_000 })
  })

  test('a provisional fixture says so', async () => {
    test.skip(!isProvisional(fixture), 'the recorded fixture has landed')
    await expect(sim.badge('PROVISIONAL').first()).toBeVisible()
  })

  test('a reading the recording does not expect is refused, not replayed', async () => {
    await sim.submitReading(sim.voltsInput, '5.000')
    await expect(sim.logRows()).toHaveCount(0)
    await expect(sim.warning).toHaveCount(0)
  })
})

async function expectResolved(sim: SimPage): Promise<void> {
  await expect(sim.diagnosis).toBeVisible()
  await expect(sim.diagnosis).toHaveAttribute('role', 'region')
  await expect(sim.diagnosis).toContainText(labelOf(fixture, 'R3_10x_low'))
  await expect(sim.diagnosis).toBeFocused()
  const shown = PERCENT.exec((await sim.diagnosis.textContent()) ?? '')
  expect(shown, 'diagnosis shows a confidence percentage').not.toBeNull()
  const percent = Number(shown![1])
  expect(percent).toBeGreaterThan(DIAGNOSIS_FLOOR * 100)
  expect(Math.abs(percent - second!.diagnosis!.confidence * 100)).toBeLessThanOrEqual(1)
  await expect(sim.logCell(2, 'reading')).toContainText('0.338')
}
