/**
 * The landing's in-page "Reduce motion" switch. Landing-local on purpose (prefs.ts belongs to the
 * web shell); the effective setting is the OS query OR this switch.
 */
import { create } from 'zustand'
import { useReducedMotion } from '@/a11y/useReducedMotion'

export const REDUCE_MOTION_KEY = 'plumbline.landing.reduceMotion'

type ReadStore = Pick<Storage, 'getItem'>
type WriteStore = Pick<Storage, 'setItem'>

function defaultStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function readStoredReduceMotion(storage: ReadStore | null = defaultStorage()): boolean {
  try {
    return storage?.getItem(REDUCE_MOTION_KEY) === '1'
  } catch {
    return false
  }
}

export function writeStoredReduceMotion(
  on: boolean,
  storage: WriteStore | null = defaultStorage(),
): void {
  try {
    storage?.setItem(REDUCE_MOTION_KEY, on ? '1' : '0')
  } catch {
    /* storage unavailable: the switch still works for this page view */
  }
}

interface MotionPrefState {
  userReduced: boolean
  setUserReduced(on: boolean): void
}

export const useMotionPref = create<MotionPrefState>((set) => ({
  userReduced: readStoredReduceMotion(),
  setUserReduced: (userReduced) => {
    writeStoredReduceMotion(userReduced)
    set({ userReduced })
  },
}))

/** True when either the OS or the in-page switch asks for reduced motion. */
export function useLandingReducedMotion(): boolean {
  const os = useReducedMotion()
  const user = useMotionPref((s) => s.userReduced)
  return os || user
}
