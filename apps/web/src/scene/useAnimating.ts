import { useEffect, useSyncExternalStore } from 'react'

/**
 * Ref-count for long-running scene motion (tremor, reveal). While the count is above zero the
 * Canvas runs `frameloop="always"`; at zero it falls back to `demand` and idles at 0 fps.
 * Short settles (camera damping, pendulum swing) chain `invalidate()` from useFrame instead,
 * so nothing here is ever touched from inside the frame loop.
 */
let count = 0
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((l) => l())
}

/** Take a lease; call the returned function once to give it back. */
export function acquireAnimation(): () => void {
  count += 1
  emit()
  let released = false
  return () => {
    if (released) return
    released = true
    count -= 1
    emit()
  }
}

export function animationCount(): number {
  return count
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAnimating(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => count > 0,
    () => false,
  )
}

/** Holds a lease for as long as `active` is true. */
export function useAnimationWhile(active: boolean): void {
  useEffect(() => (active ? acquireAnimation() : undefined), [active])
}
