/**
 * The hero instrument card's loop over recorded engine runs (UI_CONTRACT 5.2). It never touches
 * the global session store: that store feeds the announcer, and a looping hero must never speak or
 * fight the reader's own replay. The phone preview in `product` reads the same tick, two steps behind.
 *
 * Timeline: every recording contributes one tick per state, from "told, no reading yet" through
 * each recorded reading, so a recording with n readings has n + 1 ticks. Ticks run end to end
 * over the recordings in HERO_RECORDING_IDS and wrap.
 */
import { useEffect } from 'react'
import { create } from 'zustand'

export const HERO_RECORDING_IDS = [
  'worked_example',
  'seed_1',
  'seed_2',
  'seed_3',
  'seed_4',
  'seed_5',
  'unresolved_pair',
] as const

/** How far the phone preview trails the hero card, in ticks. */
export const PHONE_LAG_STEPS = 2

/** Dwell on "told this row, nothing measured yet". */
export const HERO_INSTRUCTION_MS = 2400
/** Dwell on a reading that does not end the run: long enough to read a warning. */
export const HERO_READING_MS = 3600
/** Dwell on a run's last reading (resolved or refused) before the next recording starts. */
export const HERO_FINAL_MS = 5600

export interface HeroPosition {
  /** Index into the loaded recordings. */
  recording: number
  /** Readings shown, 0 to the recording's step count. */
  readings: number
}

function ticksIn(steps: number): number {
  return steps + 1
}

export function totalTicks(stepCounts: readonly number[]): number {
  return stepCounts.reduce((sum, n) => sum + ticksIn(n), 0)
}

function wrap(tick: number, total: number): number {
  return total > 0 ? ((tick % total) + total) % total : 0
}

/** Which recording and how many readings a tick shows. Ticks outside the loop wrap around it. */
export function positionAt(stepCounts: readonly number[], tick: number): HeroPosition {
  let rest = wrap(tick, totalTicks(stepCounts))
  for (let recording = 0; recording < stepCounts.length; recording += 1) {
    const span = ticksIn(stepCounts[recording]!)
    if (rest < span) return { recording, readings: rest }
    rest -= span
  }
  return { recording: 0, readings: 0 }
}

/** The tick that shows a recording's last reading. */
export function finalTickOf(stepCounts: readonly number[], recording: number): number {
  const before = totalTicks(stepCounts.slice(0, recording))
  return before + (stepCounts[recording] ?? 0)
}

/** How long a tick stays on screen. */
export function dwellMs(stepCounts: readonly number[], tick: number): number {
  const { recording, readings } = positionAt(stepCounts, tick)
  if (readings === 0) return HERO_INSTRUCTION_MS
  return readings >= (stepCounts[recording] ?? 0) ? HERO_FINAL_MS : HERO_READING_MS
}

/** The phone preview's position: the same loop, PHONE_LAG_STEPS ticks earlier. */
export function phonePositionAt(
  stepCounts: readonly number[],
  tick: number,
  lag = PHONE_LAG_STEPS,
): HeroPosition {
  return positionAt(stepCounts, tick - lag)
}

export interface HeroState {
  tick: number
  total: number
  /** The reader pressed Pause. Only the button clears it. */
  isButtonPaused: boolean
  isPointerInside: boolean
  isFocusInside: boolean
}

export type HeroEvent =
  | { type: 'load'; total: number; reduced: boolean; restTick: number }
  | { type: 'advance' }
  | { type: 'toggle' }
  | { type: 'pointer'; inside: boolean }
  | { type: 'focus'; inside: boolean }

export const INITIAL_HERO_STATE: HeroState = {
  tick: 0,
  total: 0,
  isButtonPaused: false,
  isPointerInside: false,
  isFocusInside: false,
}

function isHeld(state: HeroState): boolean {
  return state.isPointerInside || state.isFocusInside
}

/** The loop advances only when loaded, not paused by the button and not held by hover or focus. */
export function isRunning(state: HeroState): boolean {
  return state.total > 0 && !state.isButtonPaused && !isHeld(state)
}

/** The button's name follows the button alone (UI_CONTRACT 5.2, amended): hover and focus never change it. */
export function buttonLabel(state: HeroState): 'Pause' | 'Play' {
  return state.isButtonPaused ? 'Play' : 'Pause'
}

/**
 * Pause semantics (UI_CONTRACT 5.2): one press always does what the button says. Hover or focus
 * inside the card only holds the loop; leaving releases the hold unless the button paused it.
 * Loading clears any hold left from an earlier visit. Under reduced motion the loop loads paused
 * on the worked example's final state.
 */
export function heroReducer(state: HeroState, event: HeroEvent): HeroState {
  switch (event.type) {
    case 'load':
      return {
        ...state,
        total: event.total,
        tick: event.reduced ? event.restTick : wrap(state.tick, event.total),
        isButtonPaused: event.reduced,
        isPointerInside: false,
        isFocusInside: false,
      }
    case 'advance':
      return isRunning(state) ? { ...state, tick: wrap(state.tick + 1, state.total) } : state
    case 'toggle':
      return { ...state, isButtonPaused: !state.isButtonPaused }
    case 'pointer':
      return { ...state, isPointerInside: event.inside }
    case 'focus':
      return { ...state, isFocusInside: event.inside }
  }
}

interface HeroStore {
  state: HeroState
  dispatch(event: HeroEvent): void
}

/** Landing-local store, so the phone can follow the hero without re-rendering the whole page. */
export const useHeroLoop = create<HeroStore>((set) => ({
  state: INITIAL_HERO_STATE,
  dispatch: (event) => set((st) => ({ state: heroReducer(st.state, event) })),
}))

export interface HeroTimer {
  set(callback: () => void, ms: number): unknown
  clear(handle: unknown): void
}

const WINDOW_TIMER: HeroTimer = {
  set: (callback, ms) => window.setTimeout(callback, ms),
  clear: (handle) => window.clearTimeout(handle as number),
}

/**
 * Drives the loop: loads it once the recordings are in (or reloads when reduced motion changes),
 * then schedules one advance per tick while it runs. The timer is injected for tests.
 */
export function useHeroDriver(
  stepCounts: readonly number[] | null,
  reduced: boolean,
  timer: HeroTimer = WINDOW_TIMER,
): void {
  const dispatch = useHeroLoop((st) => st.dispatch)
  const tick = useHeroLoop((st) => st.state.tick)
  const running = useHeroLoop((st) => isRunning(st.state))
  const key = stepCounts?.join(',') ?? ''

  useEffect(() => {
    if (!stepCounts) return
    dispatch({
      type: 'load',
      total: totalTicks(stepCounts),
      reduced,
      restTick: finalTickOf(stepCounts, 0),
    })
    // `key` stands for the step counts; the array identity may change on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduced, dispatch])

  // Leaving the page must never leave the loop held by a hover or focus that no longer exists.
  useEffect(
    () => () => {
      dispatch({ type: 'pointer', inside: false })
      dispatch({ type: 'focus', inside: false })
    },
    [dispatch],
  )

  useEffect(() => {
    if (!stepCounts || !running) return
    const handle = timer.set(() => dispatch({ type: 'advance' }), dwellMs(stepCounts, tick))
    return () => timer.clear(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, running, tick, timer, dispatch])
}
