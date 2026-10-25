import { z } from 'zod'
import { formatPct, formatReading } from '@/lib/format'
import type { Catalog, DomainSpec, HypothesisId, ReadingEntry, Site } from '@/state/types'

/** Pure view-model helpers for the simulator panels. No React, no store. */

/** Accessible names of the reading input (docs/UI_CONTRACT.md section 1). */
export const READING_LABELS: Record<DomainSpec['id'], string> = {
  circuit: 'Meter reading in volts',
  thermometer: 'Thermometer reading in degrees Celsius',
}

export const BELIEF_ROWS = 4

export interface BeliefRow {
  id: HypothesisId
  label: string
  p: number
}

export function beliefRows(
  belief: readonly number[],
  catalog: Catalog,
  k = BELIEF_ROWS,
): BeliefRow[] {
  return belief
    .map((p, i) => ({
      id: catalog.hypotheses[i]?.id ?? String(i),
      label: catalog.hypotheses[i]?.label ?? `Fault ${i + 1}`,
      p,
    }))
    .sort((a, b) => b.p - a.p)
    .slice(0, k)
}

export function argmax(values: readonly number[]): number {
  let best = 0
  for (let i = 1; i < values.length; i += 1) if ((values[i] ?? 0) > (values[best] ?? 0)) best = i
  return best
}

export interface PlacementItem {
  site: Site
  label: string
  /** Null until a reading has produced a placement posterior. */
  p: number | null
  isTold: boolean
  isLikely: boolean
  isLanded: boolean
  isAimed: boolean
}

interface PlacementInput {
  placement: readonly number[]
  catalog: Catalog
  toldSite: Site | null
  landedSite: Site | null
  aimedSite: Site | null
}

/** One item per site. "Likely" only exists once a reading has produced a placement posterior. */
export function placementItems({
  placement,
  catalog,
  toldSite,
  landedSite,
  aimedSite,
}: PlacementInput): PlacementItem[] {
  const hasPosterior = placement.some((p) => p > 0)
  const likely = hasPosterior ? argmax(placement) : -1
  return catalog.sites.map((site) => ({
    site: site.index,
    label: site.label,
    p: hasPosterior ? (placement[site.index] ?? 0) : null,
    isTold: site.index === toldSite,
    isLikely: site.index === likely,
    isLanded: site.index === landedSite,
    isAimed: site.index === aimedSite,
  }))
}

export function placementRoles(item: PlacementItem): string[] {
  return [
    item.isTold && 'told',
    item.isLikely && 'likely',
    item.isLanded && 'landed',
    item.isAimed && 'aimed',
  ].filter((r): r is string => Boolean(r))
}

export const NO_READING = 'No reading yet'

export function placementSentence(item: PlacementItem): string {
  const roles = placementRoles(item).join(', ')
  const value = item.p === null ? NO_READING.toLowerCase() : formatPct(item.p, 0)
  return `${capitalize(item.label)}${roles ? `, ${roles}` : ''}, ${value}`
}

export type Verdict =
  | { kind: 'waiting' }
  | { kind: 'unresolved'; text: string }
  | { kind: 'top'; label: string; p: number }

/**
 * Truehand's one-line answer beside the published method. When the engine refused, it names the
 * indistinguishable faults and gives no single percentage (rule 3: never force one answer).
 */
export function plumblineVerdict(
  rows: readonly BeliefRow[],
  hasReadings: boolean,
  unresolvedLabels: readonly string[] | null,
): Verdict {
  if (unresolvedLabels && unresolvedLabels.length > 0)
    return { kind: 'unresolved', text: `Unresolved: ${unresolvedLabels.join(' or ')}` }
  const top = rows[0]
  if (!hasReadings || !top) return { kind: 'waiting' }
  return { kind: 'top', label: top.label, p: top.p }
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Splits "Touch the red probe to row 3. Say or type the reading." into the command and its follow-up. */
export function splitFirstSentence(text: string): [string, string] {
  const at = text.indexOf('. ')
  if (at === -1) return [text, '']
  return [text.slice(0, at + 1), text.slice(at + 2)]
}

export interface LogRow {
  key: string
  step: string
  told: string
  reading: string
  landed: string
  warning: string
  hasWarning: boolean
}

export function logRows(
  readings: readonly ReadingEntry[],
  catalog: Catalog,
  spec: DomainSpec,
): LogRow[] {
  const label = (site: Site | undefined) =>
    site === undefined ? 'hidden' : (catalog.sites[site]?.label ?? `site ${site + 1}`)
  return readings.map((r) => ({
    key: `${r.step}-${r.acceptedAt}`,
    step: String(r.step + 1),
    told: label(r.toldSite),
    reading: formatReading(r.value, spec),
    landed: label(r.landedSite),
    warning: r.warning
      ? `Yes, likely ${label(r.warning.likelySite)} (${formatPct(r.warning.pOffSite, 0)})`
      : 'No',
    hasWarning: r.warning !== null,
  }))
}

const BASELINE_NAMES: Record<string, string> = {
  entropy_exact: 'Published method',
}

/** The baseline is always named; the citation sits beside it in the panel. */
export function baselineName(method: string): string {
  return BASELINE_NAMES[method] ?? 'Published method'
}

export type ReadingParse = { ok: true; value: number } | { ok: false; message: string }

const NumberText = z
  .string()
  .trim()
  .regex(/^-?(\d+([.,]\d*)?|[.,]\d+)$/)
  .transform((s) => Number(s.replace(',', '.')))

/** Validates typed input at the boundary. Messages are sentences a person can act on. */
export function parseReadingInput(
  text: string,
  spec: Pick<DomainSpec, 'readingRange' | 'unitSpoken'>,
): ReadingParse {
  if (text.trim() === '')
    return { ok: false, message: `Type the reading in ${spec.unitSpoken} first.` }
  const parsed = NumberText.safeParse(text)
  if (!parsed.success || !Number.isFinite(parsed.data))
    return {
      ok: false,
      message: `That is not a number. Type the reading in ${spec.unitSpoken}, for example 3.671.`,
    }
  const [lo, hi] = spec.readingRange
  if (parsed.data < lo || parsed.data > hi)
    return {
      ok: false,
      message: `That is outside what this instrument shows, ${lo} to ${hi} ${spec.unitSpoken}.`,
    }
  return { ok: true, value: parsed.data }
}

/** Fraction of the starting uncertainty still left, clamped to [0, 1]. Drives the plumb bob. */
export function uncertaintyFraction(entropyBits: number, maxEntropyBits: number): number {
  if (!(maxEntropyBits > 0)) return 1
  return Math.min(1, Math.max(0, entropyBits / maxEntropyBits))
}
