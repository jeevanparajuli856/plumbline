/** Pure queue reducer behind announce(). The DOM sink lives in LiveRegion.tsx. */
export type Priority = 'polite' | 'assertive'

export interface Announcement {
  text: string
  priority: Priority
  at: number
}

export interface AnnounceOptions {
  priority?: Priority
  dedupeMs?: number
  force?: boolean
}

export interface LiveQueueState {
  polite: Announcement[]
  assertive: Announcement | null
  last: Announcement | null
}

export const DEFAULT_DEDUPE_MS = 1500
export const POLITE_DRAIN_MS = 700

export const emptyQueue: LiveQueueState = { polite: [], assertive: null, last: null }

export function enqueue(
  state: LiveQueueState,
  text: string,
  now: number,
  options: AnnounceOptions = {},
): LiveQueueState {
  const priority = options.priority ?? 'polite'
  const dedupeMs = options.dedupeMs ?? DEFAULT_DEDUPE_MS
  const duplicate =
    !options.force &&
    state.last !== null &&
    state.last.text === text &&
    now - state.last.at < dedupeMs
  if (duplicate) return state
  const item: Announcement = { text, priority, at: now }
  if (priority === 'assertive') {
    return { polite: [], assertive: item, last: item }
  }
  return { ...state, polite: [...state.polite, item], last: item }
}

export function drainPolite(state: LiveQueueState): {
  next: Announcement | null
  state: LiveQueueState
} {
  const [next, ...rest] = state.polite
  return { next: next ?? null, state: { ...state, polite: rest } }
}

export function takeAssertive(state: LiveQueueState): {
  next: Announcement | null
  state: LiveQueueState
} {
  return { next: state.assertive, state: { ...state, assertive: null } }
}

type Listener = (state: LiveQueueState) => void

let queue: LiveQueueState = emptyQueue
const listeners = new Set<Listener>()

/** The single entry point every mirror uses. Spoken strings go through the same function. */
export function announce(text: string, options: AnnounceOptions = {}): void {
  queue = enqueue(queue, text, Date.now(), options)
  listeners.forEach((fn) => fn(queue))
}

export function repeatLast(): void {
  if (queue.last) announce(queue.last.text, { priority: queue.last.priority, force: true })
}

export function subscribeLive(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function readQueue(): LiveQueueState {
  return queue
}

export function replaceQueue(next: LiveQueueState): void {
  queue = next
}

export function resetLiveRegion(): void {
  queue = emptyQueue
}
