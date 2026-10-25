import { loadFixture } from '@/state/replay'
import { heroFrame } from '../heroFrame'
import {
  SCREEN_BELIEF_ROWS,
  SIMULATED_MODE,
  firstSentence,
  viewFromFrame,
  viewFromSession,
} from './appScreen'

describe('app screen view', () => {
  it('shows the worked example first reading: instruction, reading, warning, top three', async () => {
    const fx = await loadFixture('worked_example')
    const view = viewFromFrame(heroFrame(fx, 'worked_example', 1))
    expect(view.mode).toBe(SIMULATED_MODE)
    expect(view.step).toBe(`Reading 1 of ${fx.steps.length}`)
    expect(view.instruction).toBe('Touch the red probe to row 3.')
    expect(view.reading).toEqual({ digits: fx.steps[0]!.reading.toFixed(3), unit: 'V' })
    expect(view.warning).toBe('Your probe is not where you think it is. Most likely row 2.')
    expect(view.verdict).toBeNull()
    expect(view.belief).toHaveLength(SCREEN_BELIEF_ROWS)
  })

  it('ends on the answer when resolved, and on the refusal when the physics cannot tell', async () => {
    const worked = await loadFixture('worked_example')
    const done = viewFromFrame(heroFrame(worked, 'worked_example', worked.steps.length))
    expect(done.verdict).toMatchObject({ kind: 'resolved', label: 'R3 is ten times too small' })
    expect(done.warning).toBeNull()
    const pair = await loadFixture('unresolved_pair')
    const refused = viewFromFrame(heroFrame(pair, 'unresolved_pair', pair.steps.length))
    expect(refused.verdict).toMatchObject({ kind: 'unresolved' })
  })

  it('reads the live session the same way, sorted belief, no warning once resolved', () => {
    const view = viewFromSession({
      phase: 'resolved',
      instruction: 'Touch the red probe to row 3. Say or type the reading.',
      readingsCount: 2,
      lastReading: { digits: '0.338', unit: 'V' },
      warningText: 'Warning. Your probe is not where you think it is.',
      diagnosis: { label: 'R3 is ten times too small', confidence: 0.975 },
      unresolvedText: null,
      belief: [
        { label: 'a', p: 0.1 },
        { label: 'b', p: 0.7 },
        { label: 'c', p: 0.15 },
        { label: 'd', p: 0.05 },
      ],
    })
    expect(view.instruction).toBe('Touch the red probe to row 3.')
    expect(view.warning).toBeNull()
    expect(view.verdict).toEqual({ kind: 'resolved', label: 'R3 is ten times too small', p: 0.975 })
    expect(view.belief.map((b) => b.label)).toEqual(['b', 'c', 'a'])
    expect(firstSentence('One. Two.')).toBe('One.')
  })
})
