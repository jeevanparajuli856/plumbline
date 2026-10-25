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

describe('announcer aim and repeat', () => {
  let stop: () => void
  beforeEach(async () => {
    await useSession.getState().start({ mode: 'replay', fixture: 'worked_example' })
    announced.length = 0
    stop = startAnnouncer()
  })
  afterEach(() => stop())

  it('says where the probe is aimed when the user aims, and stays quiet when a step moves the aim', async () => {
    useSession.getState().aimProbe(1)
    expect(announced.map((a) => a.text)).toEqual(['Aiming at row 2.'])
    announced.length = 0
    await useSession.getState().replayNext()
    await finishRevealIfAny()
    expect(announced.some((a) => a.text.startsWith('Aiming at'))).toBe(false)
  })

  it('repeats the warning together with the instruction while a warning is pending', async () => {
    const { currentPhrase } = await import('./announcer')
    await useSession.getState().replayNext()
    await finishRevealIfAny()
    const phrase = currentPhrase(useSession.getState())
    expect(phrase).toMatch(/^Warning\./)
    expect(phrase).toMatch(/Touch the red probe to row 3/)
  })

  it('repeats the error sentence in the error phase', async () => {
    const { currentPhrase } = await import('./announcer')
    await useSession.getState().submitReading(1, 'typed')
    const s = useSession.getState()
    expect(s.phase).toBe('error')
    expect(currentPhrase(s)).toBe(s.error?.sentence)
  })
})

describe('replayPrevious', () => {
  let stop: () => void
  beforeEach(async () => {
    await useSession.getState().start({ mode: 'replay', fixture: 'worked_example' })
    stop = startAnnouncer()
  })
  afterEach(() => stop())

  it('rewinds one recorded step silently and then says where it landed, once', async () => {
    await useSession.getState().replayNext()
    await finishRevealIfAny()
    await useSession.getState().replayNext()
    await finishRevealIfAny()
    expect(useSession.getState().phase).toBe('resolved')
    announced.length = 0
    await useSession.getState().replayPrevious()
    const s = useSession.getState()
    expect(s.replay?.stepIndex).toBe(1)
    expect(s.readings).toHaveLength(1)
    expect(s.readings[0]?.landedSite).toBe(1)
    expect(s.phase).toBe('awaiting_reading')
    expect(s.warning).not.toBeNull()
    expect(s.replay?.silent).toBe(false)
    expect(announced).toHaveLength(1)
    expect(announced[0]?.text).toMatch(/^Warning\..*Touch the red probe to row 3/)
  })

  it('does nothing on the first step', async () => {
    announced.length = 0
    await useSession.getState().replayPrevious()
    expect(useSession.getState().replay?.stepIndex).toBe(0)
    expect(announced).toHaveLength(0)
  })
})
