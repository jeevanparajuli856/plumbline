import type { SessionState } from '@/state/types'

type Store = { getState(): SessionState }

/**
 * Previous step for a recording. The store only plays forward, so this resets and replays
 * `stepIndex - 1` steps, finishing each reveal immediately (no travel animation on rewind).
 */
export async function stepBack(store: Store): Promise<boolean> {
  const replay = store.getState().replay
  if (!replay || replay.stepIndex === 0) return false
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
}
