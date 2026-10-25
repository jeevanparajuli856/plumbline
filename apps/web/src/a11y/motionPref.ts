import { create } from 'zustand'

const STORAGE_KEY = 'truehand.reduceMotion'

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

interface MotionPrefState {
  reduceMotion: boolean
  setReduceMotion(on: boolean): void
}

/** In-page "Reduce motion" switch. Adds to the OS setting; it can only ever reduce motion. */
export const useMotionPref = create<MotionPrefState>((set) => ({
  reduceMotion: readStored(),
  setReduceMotion: (reduceMotion) => {
    try {
      if (reduceMotion) localStorage.setItem(STORAGE_KEY, '1')
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* storage unavailable */
    }
    set({ reduceMotion })
  },
}))

/** Mirrors the switch onto <html data-reduce-motion>, which zeroes the motion tokens in index.css. */
export function applyReduceMotion(on: boolean): void {
  if (on) document.documentElement.dataset.reduceMotion = 'true'
  else delete document.documentElement.dataset.reduceMotion
}
