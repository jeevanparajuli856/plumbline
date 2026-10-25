/**
 * DOM-side handle for the "Reset view" button. Imports nothing from three, so the shell can use
 * it without pulling the lazy scene chunk.
 */
const listeners = new Set<() => void>()

export function requestViewReset(): void {
  listeners.forEach((l) => l())
}

export function onViewReset(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
