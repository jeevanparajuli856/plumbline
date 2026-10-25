import { act, renderHook } from '@testing-library/react'
import type { FixtureT } from '@/engine/schemas'
import { loadFixture } from '@/state/replay'
import { heroCaption, heroFrame } from './heroFrame'
import {
  HERO_FINAL_MS,
  HERO_INSTRUCTION_MS,
  HERO_READING_MS,
  HERO_RECORDING_IDS,
  INITIAL_HERO_STATE,
  buttonLabel,
  PHONE_LAG_STEPS,
  dwellMs,
  finalTickOf,
  heroReducer,
  isRunning,
  phonePositionAt,
  positionAt,
  totalTicks,
  useHeroDriver,
  useHeroLoop,
  type HeroState,
  type HeroTimer,
} from './heroLoop'

/** worked_example 2 readings, seed_1 2, unresolved_pair 3: ticks 0..2, 3..5, 6..9. */
const COUNTS = [2, 2, 3]

function loaded(over: Partial<HeroState> = {}): HeroState {
  const base = heroReducer(INITIAL_HERO_STATE, {
    type: 'load',
    total: totalTicks(COUNTS),
    reduced: false,
    restTick: finalTickOf(COUNTS, 0),
  })
  return { ...base, ...over }
}

describe('hero recordings', () => {
  it('plays the worked example, then seeds 1 to 5, then the unresolved pair', () => {
    expect(HERO_RECORDING_IDS).toEqual([
      'worked_example',
      'seed_1',
      'seed_2',
      'seed_3',
      'seed_4',
      'seed_5',
      'unresolved_pair',
    ])
  })

  it('every recording exists and parses', async () => {
    for (const id of HERO_RECORDING_IDS) {
      const fx = await loadFixture(id)
      expect(fx.steps.length).toBeGreaterThan(0)
    }
  })
})

describe('hero timeline', () => {
  it('gives each recording one tick before any reading and one per reading, then wraps', () => {
    expect(totalTicks(COUNTS)).toBe(10)
    expect(positionAt(COUNTS, 0)).toEqual({ recording: 0, readings: 0 })
    expect(positionAt(COUNTS, 2)).toEqual({ recording: 0, readings: 2 })
    expect(positionAt(COUNTS, 3)).toEqual({ recording: 1, readings: 0 })
    expect(positionAt(COUNTS, 9)).toEqual({ recording: 2, readings: 3 })
    expect(positionAt(COUNTS, 10)).toEqual({ recording: 0, readings: 0 })
  })

  it('dwells longest on a final reading and shortest on the instruction', () => {
    expect(dwellMs(COUNTS, 0)).toBe(HERO_INSTRUCTION_MS)
    expect(dwellMs(COUNTS, 1)).toBe(HERO_READING_MS)
    expect(dwellMs(COUNTS, 2)).toBe(HERO_FINAL_MS)
    expect(HERO_INSTRUCTION_MS).toBeLessThan(HERO_READING_MS)
    expect(HERO_READING_MS).toBeLessThan(HERO_FINAL_MS)
  })

  it('never changes state anywhere near 3 times a second', () => {
    expect(Math.min(HERO_INSTRUCTION_MS, HERO_READING_MS, HERO_FINAL_MS)).toBeGreaterThan(1000)
  })

  it('keeps the phone two steps behind the card, wrapping back into the previous recording', () => {
    expect(PHONE_LAG_STEPS).toBe(2)
    expect(phonePositionAt(COUNTS, 4)).toEqual({ recording: 0, readings: 2 })
    expect(phonePositionAt(COUNTS, 2)).toEqual({ recording: 0, readings: 0 })
    expect(phonePositionAt(COUNTS, 0)).toEqual({ recording: 2, readings: 2 })
  })
})

describe('heroReducer: pause and resume', () => {
  it('runs once loaded and advances one tick at a time', () => {
    const st = loaded()
    expect(isRunning(st)).toBe(true)
    expect(heroReducer(st, { type: 'advance' }).tick).toBe(1)
    expect(heroReducer(loaded({ tick: 9 }), { type: 'advance' }).tick).toBe(0)
  })

  it('does not run before the recordings load', () => {
    expect(isRunning(INITIAL_HERO_STATE)).toBe(false)
    expect(heroReducer(INITIAL_HERO_STATE, { type: 'advance' }).tick).toBe(0)
  })

  it('holds while hovered and resumes when the pointer leaves', () => {
    const held = heroReducer(loaded(), { type: 'pointer', inside: true })
    expect(isRunning(held)).toBe(false)
    expect(heroReducer(held, { type: 'advance' }).tick).toBe(0)
    expect(isRunning(heroReducer(held, { type: 'pointer', inside: false }))).toBe(true)
  })

  it('holds while focus is inside and resumes when focus leaves', () => {
    const held = heroReducer(loaded(), { type: 'focus', inside: true })
    expect(isRunning(held)).toBe(false)
    expect(isRunning(heroReducer(held, { type: 'focus', inside: false }))).toBe(true)
  })

  it('stays paused after leaving when the button paused it', () => {
    let st = heroReducer(loaded(), { type: 'toggle' })
    expect(isRunning(st)).toBe(false)
    st = heroReducer(st, { type: 'pointer', inside: true })
    st = heroReducer(st, { type: 'pointer', inside: false })
    expect(isRunning(st)).toBe(false)
  })

  it('names the button from the button alone: hover and focus hold without renaming', () => {
    let st = loaded()
    expect(buttonLabel(st)).toBe('Pause')
    st = heroReducer(st, { type: 'pointer', inside: true })
    st = heroReducer(st, { type: 'focus', inside: true })
    expect(isRunning(st)).toBe(false)
    expect(buttonLabel(st)).toBe('Pause')
    st = heroReducer(st, { type: 'toggle' })
    expect(buttonLabel(st)).toBe('Play')
    st = heroReducer(st, { type: 'pointer', inside: false })
    st = heroReducer(st, { type: 'focus', inside: false })
    expect(isRunning(st)).toBe(false)
    st = heroReducer(st, { type: 'toggle' })
    expect(buttonLabel(st)).toBe('Pause')
    expect(isRunning(st)).toBe(true)
  })

  it('clears a stale hover or focus hold when the loop loads again', () => {
    const held = { ...loaded(), isPointerInside: true, isFocusInside: true }
    const st = heroReducer(held, { type: 'load', total: 10, reduced: false, restTick: 2 })
    expect(isRunning(st)).toBe(true)
  })

  it('loads paused on the worked example final state under reduced motion', () => {
    const st = heroReducer(INITIAL_HERO_STATE, {
      type: 'load',
      total: totalTicks(COUNTS),
      reduced: true,
      restTick: finalTickOf(COUNTS, 0),
    })
    expect(isRunning(st)).toBe(false)
    expect(st.isButtonPaused).toBe(true)
    expect(positionAt(COUNTS, st.tick)).toEqual({ recording: 0, readings: 2 })
  })
})

describe('useHeroDriver', () => {
  function fakeTimer() {
    const pending: Array<{ cb: () => void; ms: number; alive: boolean }> = []
    const timer: HeroTimer = {
      set: (cb, ms) => {
        const t = { cb, ms, alive: true }
        pending.push(t)
        return t
      },
      clear: (h) => {
        ;(h as { alive: boolean }).alive = false
      },
    }
    const fire = () => {
      const t = pending.filter((p) => p.alive).at(-1)
      if (!t) throw new Error('no timer armed')
      t.alive = false
      act(() => t.cb())
      return t.ms
    }
    const armed = () => pending.filter((p) => p.alive).length
    return { timer, fire, armed }
  }

  beforeEach(() => useHeroLoop.setState({ state: INITIAL_HERO_STATE }))

  it('schedules each tick with its dwell and advances on the timer', () => {
    const { timer, fire } = fakeTimer()
    renderHook(() => useHeroDriver(COUNTS, false, timer))
    expect(fire()).toBe(HERO_INSTRUCTION_MS)
    expect(useHeroLoop.getState().state.tick).toBe(1)
    expect(fire()).toBe(HERO_READING_MS)
    expect(fire()).toBe(HERO_FINAL_MS)
    expect(useHeroLoop.getState().state.tick).toBe(3)
  })

  it('releases any hover or focus hold when it unmounts', () => {
    const { timer } = fakeTimer()
    const { unmount } = renderHook(() => useHeroDriver(COUNTS, false, timer))
    act(() => useHeroLoop.getState().dispatch({ type: 'pointer', inside: true }))
    act(() => useHeroLoop.getState().dispatch({ type: 'focus', inside: true }))
    unmount()
    const st = useHeroLoop.getState().state
    expect(st.isPointerInside || st.isFocusInside).toBe(false)
  })

  it('arms no timer while paused and none under reduced motion', () => {
    const a = fakeTimer()
    renderHook(() => useHeroDriver(COUNTS, false, a.timer))
    act(() => useHeroLoop.getState().dispatch({ type: 'toggle' }))
    expect(a.armed()).toBe(0)

    useHeroLoop.setState({ state: INITIAL_HERO_STATE })
    const b = fakeTimer()
    renderHook(() => useHeroDriver(COUNTS, true, b.timer))
    expect(b.armed()).toBe(0)
    expect(positionAt(COUNTS, useHeroLoop.getState().state.tick)).toEqual({
      recording: 0,
      readings: 2,
    })
  })

  it('waits for the recordings before arming anything', () => {
    const { timer, armed } = fakeTimer()
    renderHook(() => useHeroDriver(null, false, timer))
    expect(armed()).toBe(0)
  })
})

describe('heroFrame', () => {
  let worked: FixtureT
  let pair: FixtureT

  beforeAll(async () => {
    worked = await loadFixture('worked_example')
    pair = await loadFixture('unresolved_pair')
  })

  it('tells the worked example from its recording: told row 3, landed row 2, warning', () => {
    const f = heroFrame(worked, 'worked_example', 1)
    expect(f.toldLabel).toBe(worked.catalog.site_labels[worked.steps[0]!.told_site])
    expect(f.landedLabel).toBe(worked.catalog.site_labels[worked.steps[0]!.landed_site!])
    expect(f.readingDigits).toBe(worked.steps[0]!.reading.toFixed(3))
    expect(f.warning).not.toBeNull()
    expect(heroCaption(f)).toBe(
      `Recording the worked example, simulated hand, reading 1 of 2: told ${f.toldLabel}, landed ${f.landedLabel}, read ${f.reading}. Warning: the probe is probably not on the told row.`,
    )
  })

  it('shows the instruction and no reading before the first reading', () => {
    const f = heroFrame(worked, 'worked_example', 0)
    expect(f.readingDigits).toBeNull()
    expect(f.landed).toBeNull()
    expect(heroCaption(f)).toContain('before any reading')
  })

  it('carries the refusal and the refused pair when the run ends unresolved', () => {
    const f = heroFrame(pair, 'unresolved_pair', pair.steps.length)
    expect(f.unresolvedText).toBe(pair.steps.at(-1)!.unresolved!.text)
    expect(f.unresolvedLabels).toHaveLength(2)
    expect(f.isResolved).toBe(false)
    expect(heroCaption(f)).toContain('Unresolved')
  })
})
