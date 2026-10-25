import { needsFullUi } from './helpers/full'
import { isProvisional } from './helpers/fixture'
import { readLandedLog, recordLandedCells, revealAnimates } from './helpers/landedLog'
import { STORY, WORKED } from './helpers/story'
import { stepReplay } from './helpers/stepReplay'
import { expect, test } from './helpers/test'
import { SimPage } from './pages/SimPage'

// The story (rule 6): true fault R3 ten times too small, told row 3, the hand lands on row 2 and
// reads 3.671 V, Plumbline warns, the second reading 0.338 V resolves it. Expected values come
// from the fixture the app replays (helpers/story.ts), never typed from the brief.
const DIAGNOSIS_FLOOR = 0.95
const PERCENT = /(\d+(?:\.\d+)?)\s*%/
const SCENE_FRAME_TIMEOUT_MS = 10_000
/** `errorFor('not_next_in_replay')` in src/state/session.ts. */
const NOT_NEXT_SENTENCE =
  'The recording expects a different reading next. Press Next to let it play.'
/** A reading the worked example never records at its first step. */
const UNEXPECTED_READING = '5.000'

// The brief's story, pinned once against the fixture; every other test reads STORY.
test('the fixture is the worked example', () => {
  const [first, second] = WORKED.steps
  expect(first!.told_site).toBe(2)
  expect(first!.reading).toBeCloseTo(3.671, 3)
  expect(first!.landed_site).toBe(1)
  expect(first!.warning).toBe(true)
  expect(second!.reading).toBeCloseTo(0.338, 3)
  expect(STORY.diagnosisId).toBe('R3_10x_low')
  expect(STORY.diagnosisConfidence).toBeGreaterThan(DIAGNOSIS_FLOOR)
})

test.describe('worked example replay', () => {
  needsFullUi('web-shell (/sim panels)')

  let sim: SimPage
  test.beforeEach(async ({ page }) => {
    await recordLandedCells(page)
    sim = new SimPage(page)
    await sim.goto({ demo: 'worked-example' })
    await expect(sim.instruction).toContainText(STORY.toldLabel)
  })

  test('typed readings: warns about the landed row, then diagnoses the fixture fault', async () => {
    await expect(sim.heading).toContainText(STORY.toldLabel)
    await expect(sim.logRows()).toHaveCount(0)

    await sim.submitReading(sim.voltsInput, STORY.firstReading)
    await sim.waitForStep(1)
    await expect(sim.logCell(1, 'told')).toHaveText(STORY.toldLabel)
    await expect(sim.logCell(1, 'reading')).toContainText(STORY.firstReading)
    await expect(sim.logCell(1, 'landed')).toHaveText(STORY.landedLabel)
    await expect(sim.warningRegion).toHaveAttribute('data-testid', 'warning-banner')
    await expect(sim.warning).toBeFocused()
    await expect(sim.warning).toHaveText(/^\s*Warning\./)
    await expect(sim.warning).toContainText(STORY.landedLabel)
    await expect(sim.diagnosis).toHaveCount(0)

    // The published method trusts the told row and is already certain of the wrong fault.
    await expect(sim.beliefFigure).toContainText('Published method')
    await expect(sim.beliefFigure).toContainText(STORY.baselineLabel)

    await sim.submitReading(sim.voltsInput, STORY.secondReading)
    await sim.waitForStep(2)
    await expectResolved(sim)
  })

  test('replay button: same story without typing', async () => {
    await stepReplay(sim, 1)
    await expect(sim.warning).toContainText(STORY.landedLabel)
    await stepReplay(sim, 1)
    await expectResolved(sim)
  })

  test('landed row is "hidden" until the reveal, then the landed label', async ({ page }) => {
    if ((await sim.scene.count()) > 0) {
      await page
        .waitForFunction(
          () =>
            ((window as { __plumblineScene?: { frames: number } }).__plumblineScene?.frames ?? 0) >
            0,
          undefined,
          { timeout: SCENE_FRAME_TIMEOUT_MS },
        )
        .catch(() => undefined)
    }
    const animated = await revealAnimates(page)
    await expect(sim.logRows()).toHaveCount(0)

    await sim.next.click()
    await sim.waitForStep(1)
    await expect(sim.logCell(1, 'landed')).toHaveText(STORY.landedLabel)

    const [firstRow] = await readLandedLog(page)
    if (animated) {
      expect(firstRow).toEqual(['hidden', STORY.landedLabel])
    } else {
      // Reduced motion or no scene: the store finishes the reveal in the same update.
      expect([['hidden', STORY.landedLabel], [STORY.landedLabel]]).toContainEqual(firstRow)
    }
  })

  test('a provisional fixture says so', async () => {
    test.skip(!isProvisional(WORKED), 'the recorded fixture has landed')
    await expect(sim.badge('PROVISIONAL').first()).toBeVisible()
  })

  test('a reading the recording does not expect is refused, not replayed', async ({ page }) => {
    await sim.submitReading(sim.voltsInput, UNEXPECTED_READING)
    // The sentence is shown in the error panel and also spoken through the assertive region;
    // scope to the panel so the two copies never make the locator ambiguous.
    await expect(page.getByTestId('session-error').getByText(NOT_NEXT_SENTENCE)).toBeVisible()
    await expect(sim.liveAssertive).toHaveText(NOT_NEXT_SENTENCE)
    await expect(sim.logRows()).toHaveCount(0)
    await expect(sim.warning).toHaveCount(0)
  })
})

async function expectResolved(sim: SimPage): Promise<void> {
  await expect(sim.diagnosis).toBeVisible()
  await expect(sim.diagnosis).toHaveAttribute('role', 'region')
  await expect(sim.diagnosis).toContainText(STORY.diagnosisLabel)
  await expect(sim.diagnosis).toBeFocused()
  const shown = PERCENT.exec((await sim.diagnosis.textContent()) ?? '')
  expect(shown, 'diagnosis shows a confidence percentage').not.toBeNull()
  const percent = Number(shown![1])
  expect(percent).toBeGreaterThan(DIAGNOSIS_FLOOR * 100)
  expect(Math.abs(percent - STORY.diagnosisConfidence * 100)).toBeLessThanOrEqual(1)
  await expect(sim.logCell(2, 'reading')).toContainText(STORY.secondReading)
}
