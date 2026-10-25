import { DOMAINS } from '@/state/domains'
import type { SessionData } from '@/state/types'
import { announce } from './liveQueue'

type Readable = Pick<
  SessionData,
  'domain' | 'phase' | 'catalog' | 'instruction' | 'diagnosis' | 'unresolved'
>

/**
 * The sentence the R key repeats: the current instruction while one is pending, otherwise the
 * diagnosis or the refusal. Words come from state/domains.ts, the same phrases the announcer uses.
 */
export function currentPhrase(state: Readable): string | null {
  const spec = DOMAINS[state.domain]
  const catalog = state.catalog
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
  return site ? spec.phrases.instruction(site) : null
}

/**
 * R key. A user request, not an engine event, so it is the one documented exception to
 * "only announcer.ts announces": it re-sends the current phrase with `force` so the dedupe
 * window does not swallow a deliberate repeat.
 */
export function repeatInstruction(state: Readable): boolean {
  const text = currentPhrase(state)
  if (!text) return false
  announce(text, { force: true })
  return true
}
