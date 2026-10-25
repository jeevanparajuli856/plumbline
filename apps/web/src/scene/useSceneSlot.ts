import { useSyncExternalStore } from 'react'

export const SCENE_SLOT_ID = 'scene-slot'

function subscribeToSlot(listener: () => void): () => void {
  const observer = new MutationObserver(listener)
  observer.observe(document.body, { childList: true, subtree: true })
  return () => observer.disconnect()
}

const findSlot = () => document.getElementById(SCENE_SLOT_ID)
const noSlot = () => null
const noSubscription = () => () => {}

/** The web-shell's #scene-slot, tracked while the sim is showing (it may render after us). */
export function useSceneSlot(active: boolean): HTMLElement | null {
  return useSyncExternalStore(
    active ? subscribeToSlot : noSubscription,
    active ? findSlot : noSlot,
    noSlot,
  )
}
