import { needsFullUi } from './helpers/full'
import { labelOf, readFixture, recordedFixtureExists } from './helpers/fixture'
import { stepReplay } from './helpers/stepReplay'
import { expect, test } from './helpers/test'
import { SimPage } from './pages/SimPage'

// Rule 3: refusal is a feature. When two faults are electrically indistinguishable, the UI says
// "unresolved", names both, and does not pick one. Labels come from the recorded fixture.
const FIXTURE = 'unresolved_pair'
const isRecorded = recordedFixtureExists(FIXTURE)
const fixture = isRecorded ? readFixture(FIXTURE) : null
const finalStep = fixture?.steps[fixture.steps.length - 1]
const pairLabels = (finalStep?.unresolved?.classes[0] ?? []).map((id) => labelOf(fixture!, id))
const PERCENT = /\d+(?:\.\d+)?\s*%/

test.describe('refusal on an indistinguishable pair', () => {
  test.skip(!isRecorded, `${FIXTURE} is not recorded yet (engine lane, record_fixtures.py)`)
  needsFullUi('web-shell (Unresolved region, belief verdict)')

  test('the recording ends unresolved on a pair', () => {
    expect(finalStep?.status).toBe('unresolved')
    expect(pairLabels.length).toBeGreaterThanOrEqual(2)
  })

  test('steps to the end, refuses, names both faults, and shows no winner', async ({ page }) => {
    const sim = new SimPage(page)
    await sim.goto({ mode: 'replay', fixture: FIXTURE })
    await stepReplay(sim, fixture!.steps.length)

    await expect(sim.unresolved).toBeVisible()
    await expect(page.getByRole('region', { name: 'Unresolved' })).toHaveAttribute(
      'data-testid',
      'unresolved',
    )
    await expect(sim.unresolved).toContainText('will not guess')
    for (const label of pairLabels) await expect(sim.unresolved).toContainText(label)
    await expect(sim.diagnosis).toHaveCount(0)

    // The belief verdict says Unresolved and carries no single winning fault with a percentage.
    const verdict = sim.beliefFigure.getByText(/^\s*Unresolved/).first()
    await expect(verdict).toBeVisible()
    await expect(verdict).not.toHaveText(PERCENT)
  })
})
