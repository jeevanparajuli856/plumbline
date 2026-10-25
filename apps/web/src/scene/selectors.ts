import type { SessionState } from '@/state/types'
import { SITE_COUNT, partForHypothesis, partRows, type PartId } from './layout'

/**
 * What the scene draws, derived from the session store. Pure; components pass these to
 * useSession as selectors. The landed site is never visible before a reveal has finished.
 */
const lastReading = (s: SessionState) => s.readings[s.readings.length - 1]

/**
 * The row the user was told. During a reveal the store already holds the next instruction,
 * so the told row is the last reading's.
 */
export function toldSite(s: SessionState): number | null {
  if (s.phase === 'revealing') return lastReading(s)?.toldSite ?? null
  return s.instruction?.site ?? lastReading(s)?.toldSite ?? null
}

/** The warned row, held back until the probe has landed so the reveal is not spoiled. */
export function warningSite(s: SessionState): number | null {
  if (s.phase === 'revealing' || !s.warning) return null
  return s.warning.toldSite
}

/** The landed row exists for drawing only once the reveal has finished. */
export function landedSite(s: SessionState): number | null {
  if (s.phase === 'revealing') return null
  return lastReading(s)?.landedSite ?? null
}

/** Parts the plumb line should point at: the diagnosis, or up to two unresolved candidates. */
export function plumbCandidates(s: SessionState): PartId[] {
  if (s.phase === 'resolved' && s.diagnosis) {
    const part = partForHypothesis(s.diagnosis.hypothesisId)
    return part ? [part] : []
  }
  if (s.phase === 'unresolved' && s.unresolved) {
    const parts = s.unresolved.classes
      .flat()
      .map(partForHypothesis)
      .filter((p): p is PartId => p !== null)
    return [...new Set(parts)].slice(0, 2)
  }
  return []
}

export const BRACKET_SPREAD_ROWS = 2

/**
 * Rows the static reduced-motion bracket spans, or null: told row +/- 2 instead of the tremor
 * while awaiting a reading; the candidates' rows when unresolved.
 */
export function bracketRows(s: SessionState): [number, number] | null {
  if (s.phase === 'unresolved') {
    const rows = plumbCandidates(s).flatMap(partRows)
    if (rows.length === 0) return null
    return [Math.min(...rows), Math.max(...rows)]
  }
  if (s.phase !== 'awaiting_reading') return null
  const told = toldSite(s)
  if (told === null) return null
  return [
    Math.max(0, told - BRACKET_SPREAD_ROWS),
    Math.min(SITE_COUNT - 1, told + BRACKET_SPREAD_ROWS),
  ]
}
