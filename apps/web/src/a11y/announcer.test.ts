import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const announced: Array<{ text: string; priority: string }> = []
vi.mock('./liveQueue', () => ({
  announce: (text: string, opts?: { priority?: string }) =>
    announced.push({ text, priority: opts?.priority ?? 'polite' }),
}))

const { startAnnouncer } = await import('./announcer')
const { useSession } = await import('@/state/session')

async function finishRevealIfAny(): Promise<void> {
  const s = useSession.getState()
  if (s.phase === 'revealing' && s.reveal) s.finishReveal(s.reveal.token)
}

describe('announcer', () => {
  let stop: () => void
  beforeEach(async () => {
    await useSession.getState().start({ mode: 'replay', fixture: 'worked_example' })
    announced.length = 0
    stop = startAnnouncer()
  })
  afterEach(() => stop())

  it('announces the warning assertively and the next instruction after the first reading', async () => {
    await useSession.getState().replayNext()
    await finishRevealIfAny()
    expect(announced[0]?.text).toMatch(/volts, accepted/)
    expect(announced.some((a) => a.priority === 'assertive' && a.text.startsWith('Warning.'))).toBe(true)
    expect(announced.at(-1)?.text).toMatch(/^Touch the red probe to/)
  })

  it('announces the diagnosis when the replay resolves', async () => {
    await useSession.getState().replayNext()
    await finishRevealIfAny()
    await useSession.getState().replayNext()
    await finishRevealIfAny()
    expect(announced.at(-1)?.text).toMatch(/Confidence/)
  })

  it('announces the new instruction after a reset taken while awaiting a reading', async () => {
    await useSession.getState().replayNext()
    await finishRevealIfAny()
    announced.length = 0
    await useSession.getState().reset()
    expect(useSession.getState().phase).toBe('awaiting_reading')
    expect(announced.map((a) => a.text)).toEqual([
      expect.stringMatching(/^Touch the red probe to/),
    ])
  })

  it('announces the accepted reading again after a reset drops the reading count', async () => {
    await useSession.getState().replayNext()
    await finishRevealIfAny()
    await useSession.getState().reset()
    announced.length = 0
    await useSession.getState().replayNext()
    await finishRevealIfAny()
    expect(announced[0]?.text).toMatch(/volts, accepted/)
  })
})
