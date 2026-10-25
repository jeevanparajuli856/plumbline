import { useEffect, useState } from 'react'
import { API_URL } from '@/lib/env'
import type { ApiHealth } from '@/state/types'
import { initialProbe, nextProbeDelay, onProbeResult, probeOnce } from './healthProbe'

/**
 * Polls `${VITE_API_URL}/v1/health` (4 s timeout, every 5 s, gives up after 90 s) and reports
 * each result through `report` (the store's setApiHealth). Returns a function that starts over.
 */
export function useApiHealthProbe(
  report: (health: ApiHealth) => void,
  fetchImpl: typeof fetch = fetch,
): () => void {
  const [run, setRun] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let timer: number | undefined
    let state = initialProbe(Date.now())
    const tick = async () => {
      const ok = await probeOnce(`${API_URL}/v1/health`, fetchImpl, undefined, controller.signal)
      if (controller.signal.aborted) return
      state = onProbeResult(state, ok, Date.now())
      report(state.health)
      const delay = nextProbeDelay(state)
      if (delay !== null) timer = window.setTimeout(() => void tick(), delay)
    }
    void tick()
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [run, report, fetchImpl])
  return () => setRun((n) => n + 1)
}
