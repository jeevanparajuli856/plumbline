import { useSyncExternalStore } from 'react'
import type { SessionState } from '@/state/types'

type Store = { getState(): SessionState }

let rewinding = false
const listeners = new Set<() => void>()

function setRewinding(on: boolean): void {
  rewinding = on
  listeners.forEach((fn) => fn())
}

export function isRewinding(): boolean {
  return rewinding
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** True while stepBack is replaying; the page disables Previous, Next and Play meanwhile. */
export function useRewinding(): boolean {
  return useSyncExternalStore(subscribe, isRewinding)
}

/**
 * Previous step for a recording, through the store's silent replayPrevious (the announcer says
 * where it landed, once). A second call while one is running is ignored.
 */
export async function stepBack(store: Store): Promise<boolean> {
  const replay = store.getState().replay
  if (rewinding || !replay || replay.stepIndex === 0) return false
  setRewinding(true)
  try {
    await store.getState().replayPrevious()
    return true
  } finally {
    setRewinding(false)
  }
}
