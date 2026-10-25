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
 * Previous step for a recording. The store only plays forward, so this resets and replays
 * `stepIndex - 1` steps, finishing each reveal immediately (no travel animation on rewind).
 * A second call while one is running is ignored. Intermediate steps are not silenced: the store's
 * `silent` flag can only be set at start (a store-side replayPrevious is planned on main).
 */
export async function stepBack(store: Store): Promise<boolean> {
  const replay = store.getState().replay
  if (rewinding || !replay || replay.stepIndex === 0) return false
  setRewinding(true)
  try {
    const target = replay.stepIndex - 1
    store.getState().replayPause()
    await store.getState().reset()
    for (let i = 0; i < target; i += 1) {
      await store.getState().replayNext()
      const reveal = store.getState().reveal
      if (reveal) store.getState().finishReveal(reveal.token)
      if (store.getState().phase !== 'awaiting_reading') break
    }
    return true
  } finally {
    setRewinding(false)
  }
}
