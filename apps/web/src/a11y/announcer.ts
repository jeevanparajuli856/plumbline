import { announce } from './liveQueue'
import { DOMAINS } from '@/state/domains'
import { useSession } from '@/state/session'
import type { Phase, SessionData } from '@/state/types'

/**
 * The ONLY place engine events become screen-reader text (and, through phrases, speech).
 * Subscribes to the store so the mirror exists whether the scene, the text channel or the
 * landing is mounted. Returns an unsubscribe function.
 */
export function startAnnouncer(): () => void {
  const initial = useSession.getState()
  let lastPhase: Phase = initial.phase
  let lastReadingCount = initial.readings.length
  let lastSessionId = initial.sessionId
  let lastDomain = initial.domain
  let lastAimed = initial.aimedSite
  return useSession.subscribe((state) => {
    const spec = DOMAINS[state.domain]
    const catalog = state.catalog
    // A fresh start (new session, new instrument, or a reset that drops the readings) may keep the
    // same phase, so it is detected here and its first instruction is announced explicitly.
    const isFreshStart =
      state.sessionId !== lastSessionId ||
      state.domain !== lastDomain ||
      state.readings.length < lastReadingCount
    if (isFreshStart) {
      lastAimed = state.aimedSite
      lastSessionId = state.sessionId
      lastDomain = state.domain
      lastReadingCount = state.readings.length
      lastPhase = state.phase
      const site = state.instruction && catalog ? catalog.sites[state.instruction.site] : undefined
      const silent = state.replay?.silent ?? false
      if (site && !silent && state.phase === 'awaiting_reading')
        announce(spec.phrases.instruction(site))
      return
    }
    if (state.readings.length > lastReadingCount && catalog) {
      lastReadingCount = state.readings.length
      const last = state.readings[state.readings.length - 1]
      if (last) announce(spec.phrases.accepted(last.value))
    }
    const aimChanged = state.aimedSite !== lastAimed
    lastAimed = state.aimedSite
    if (state.phase === lastPhase) {
      // Only a user aims without a phase change; a step moves the aim together with the phase.
      const aimed = state.aimedSite !== null && catalog ? catalog.sites[state.aimedSite] : undefined
      if (aimChanged && aimed && state.phase === 'awaiting_reading')
        announce(spec.phrases.aimed(aimed))
      return
    }
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

type Readable = Pick<
  SessionData,
  'domain' | 'phase' | 'catalog' | 'instruction' | 'diagnosis' | 'unresolved'
> &
  Partial<Pick<SessionData, 'warning' | 'error'>>

/**
 * The sentence the R key repeats, built from the same phrases the announcer uses: the error
 * while in error, the diagnosis or refusal when terminal, otherwise the pending warning (if any)
 * followed by the current instruction.
 */
export function currentPhrase(state: Readable): string | null {
  const spec = DOMAINS[state.domain]
  const catalog = state.catalog
  if (state.phase === 'error') return state.error?.sentence ?? null
  if (!catalog) return null
  if (state.phase === 'resolved' && state.diagnosis) {
    const meta = catalog.hypotheses.find((h) => h.id === state.diagnosis?.hypothesisId)
    return meta ? spec.phrases.diagnosis(meta, state.diagnosis.confidence) : null
  }
  if (state.phase === 'unresolved' && state.unresolved) {
    const ids = state.unresolved.classes[0] ?? []
    return (
      state.unresolved.text ||
      spec.phrases.unresolved(catalog.hypotheses.filter((h) => ids.includes(h.id)))
    )
  }
  const site = state.instruction ? catalog.sites[state.instruction.site] : undefined
  const instruction = site ? spec.phrases.instruction(site) : null
  if (state.warning && instruction) return `${state.warning.text} ${instruction}`
  return instruction
}

/**
 * R key. A user request rather than an engine event: it re-sends the current phrase with
 * `force` so the dedupe window does not swallow a deliberate repeat.
 */
export function repeatCurrent(state: Readable): boolean {
  const text = currentPhrase(state)
  if (!text) return false
  announce(text, { force: true })
  return true
}

function argmax(values: number[]): number {
  let best = 0
  for (let i = 1; i < values.length; i += 1) if ((values[i] ?? 0) > (values[best] ?? 0)) best = i
  return best
}
