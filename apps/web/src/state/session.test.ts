import { beforeEach, describe, expect, it } from 'vitest'
import { useSession } from './session'

describe('session store with the provisional worked example', () => {
  beforeEach(async () => {
    await useSession.getState().start({ mode: 'replay', fixture: 'worked_example' })
  })

  it('starts awaiting a reading on the instructed row 3', () => {
    const s = useSession.getState()
    expect(s.phase).toBe('awaiting_reading')
    expect(s.instruction?.site).toBe(2)
    expect(s.catalog?.hypotheses).toHaveLength(33)
    expect(s.replay?.provisional).toBe(true)
  })

  it('warns after 3.671 V and publishes the landed row only once the reveal finishes', async () => {
    await useSession.getState().submitReading(3.671, 'typed')
    let s = useSession.getState()
    expect(s.warning?.likelySite).toBe(1)
    // jsdom has no WebGL, so the store finishes the reveal itself and the row is public at once.
    if (s.phase === 'revealing' && s.reveal) {
      expect(s.readings[0]?.landedSite).toBeUndefined()
      s.finishReveal(s.reveal.token)
    }
    s = useSession.getState()
    expect(s.phase).toBe('awaiting_reading')
    expect(s.readings[0]?.landedSite).toBe(1)
    expect(s.baseline?.diagnosis?.hypothesisId).toBe('R2_short')
  })

  it('rejects a reading that is not the next recorded one', async () => {
    await useSession.getState().submitReading(1.0, 'typed')
    expect(useSession.getState().error?.code).toBe('not_next_in_replay')
  })

  it('resolves to R3 ten times too small after the second recorded reading', async () => {
    await useSession.getState().replayNext()
    let s = useSession.getState()
    if (s.phase === 'revealing' && s.reveal) s.finishReveal(s.reveal.token)
    await useSession.getState().replayNext()
    s = useSession.getState()
    if (s.phase === 'revealing' && s.reveal) s.finishReveal(s.reveal.token)
    s = useSession.getState()
    expect(s.phase).toBe('resolved')
    expect(s.diagnosis?.hypothesisId).toBe('R3_10x_low')
    expect(s.diagnosis?.confidence).toBeGreaterThan(0.95)
  })
})
