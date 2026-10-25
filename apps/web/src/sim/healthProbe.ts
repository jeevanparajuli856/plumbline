import type { ApiHealth } from '@/state/types'

/** Render's free tier sleeps; these bound how long we wait for it to wake (ADR-0005). */
export const HEALTH_TIMEOUT_MS = 4000
export const HEALTH_POLL_MS = 5000
export const HEALTH_GIVE_UP_MS = 90_000

export interface ProbeState {
  health: ApiHealth
  startedAt: number
  attempts: number
  polling: boolean
}

export function initialProbe(now: number): ProbeState {
  return { health: 'unknown', startedAt: now, attempts: 0, polling: true }
}

/** One answer from /v1/health. Failures inside the give-up window read as "waking", after it as "down". */
export function onProbeResult(state: ProbeState, ok: boolean, now: number): ProbeState {
  const attempts = state.attempts + 1
  if (ok) return { ...state, attempts, health: 'ok', polling: false }
  const gaveUp = now - state.startedAt >= HEALTH_GIVE_UP_MS
  return { ...state, attempts, health: gaveUp ? 'down' : 'waking', polling: !gaveUp }
}

export function nextProbeDelay(state: ProbeState): number | null {
  return state.polling ? HEALTH_POLL_MS : null
}

/** GET the health endpoint with a hard timeout. Never throws; any failure is `false`. */
export async function probeOnce(
  url: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = HEALTH_TIMEOUT_MS,
  outer?: AbortSignal,
): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const onOuterAbort = () => controller.abort()
  outer?.addEventListener('abort', onOuterAbort)
  try {
    const response = await fetchImpl(url, { signal: controller.signal, cache: 'no-store' })
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
    outer?.removeEventListener('abort', onOuterAbort)
  }
}

/** The honest status sentence. Every non-ok state names "waking up" so nobody waits blind. */
export function healthSentence(health: ApiHealth): string {
  switch (health) {
    case 'ok':
      return 'Engine online.'
    case 'unknown':
      return 'Checking the engine. If it is waking up, the recorded worked example still runs.'
    case 'waking':
      return 'The engine is waking up; free hosting sleeps when idle. The recorded worked example runs now.'
    case 'down':
      return 'The engine did not finish waking up. The recorded worked example still runs; simulate and live need the engine.'
  }
}
