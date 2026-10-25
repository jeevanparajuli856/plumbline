import { announce } from './liveQueue'
import { DOMAINS } from '@/state/domains'
import { useSession } from '@/state/session'
import type { Phase } from '@/state/types'

/**
 * The ONLY place engine events become screen-reader text (and, through phrases, speech).
 * Subscribes to the store so the mirror exists whether the scene, the text channel or the
 * landing is mounted. Returns an unsubscribe function.
 */
export function startAnnouncer(): () => void {
  let lastPhase: Phase = useSession.getState().phase
  let lastReadingCount = 0
  return useSession.subscribe((state) => {
    const spec = DOMAINS[state.domain]
    const catalog = state.catalog
    if (state.readings.length > lastReadingCount && catalog) {
      lastReadingCount = state.readings.length
      const last = state.readings[state.readings.length - 1]
      if (last) announce(spec.phrases.accepted(last.value))
    }
    if (state.phase === lastPhase) return
    const previous = lastPhase
    lastPhase = state.phase
    if (!catalog) return
    const silent = state.replay?.silent ?? false
    if (silent) return
    switch (state.phase) {
      case 'awaiting_reading': {
        if (previous === 'revealing' || previous === 'submitting') {
          if (state.warning) announce(state.warning.text, { priority: 'assertive' })
          else {
            const likely = catalog.sites[argmax(state.placement)]
            if (likely && state.readings.length > 0)
              announce(spec.phrases.likely(likely, Math.max(...state.placement)))
          }
        }
        const site = state.instruction ? catalog.sites[state.instruction.site] : undefined
        if (site) announce(spec.phrases.instruction(site))
        break
      }
      case 'resolved': {
        const d = state.diagnosis
        const meta = d ? catalog.hypotheses.find((h) => h.id === d.hypothesisId) : undefined
        if (d && meta) announce(spec.phrases.diagnosis(meta, d.confidence))
        break
      }
      case 'unresolved': {
        const ids = state.unresolved?.classes[0] ?? []
        const pair = catalog.hypotheses.filter((h) => ids.includes(h.id))
        announce(state.unresolved?.text || spec.phrases.unresolved(pair))
        break
      }
      case 'error': {
        if (state.error) announce(state.error.sentence, { priority: 'assertive' })
        break
      }
      default:
        break
    }
  })
}

function argmax(values: number[]): number {
  let best = 0
  for (let i = 1; i < values.length; i += 1) if ((values[i] ?? 0) > (values[best] ?? 0)) best = i
  return best
}
