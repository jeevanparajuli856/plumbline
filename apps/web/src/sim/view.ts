import { z } from 'zod'
import { formatPct, formatReading } from '@/lib/format'
import type { Catalog, DomainSpec, HypothesisId, ReadingEntry, Site } from '@/state/types'

/** Pure view-model helpers for the simulator panels. No React, no store. */

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
  p: number
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
    p: placement[site.index] ?? 0,
    isTold: site.index === toldSite,
    isLikely: site.index === likely,
    isLanded: site.index === landedSite,
    isAimed: site.index === aimedSite,
  }))
}

export function placementSentence(item: PlacementItem): string {
  const roles = [
    item.isTold && 'told',
    item.isLikely && 'likely',
    item.isLanded && 'landed',
    item.isAimed && 'aimed',
  ]
    .filter(Boolean)
    .join(', ')
  return `${capitalize(item.label)}${roles ? `, ${roles}` : ''}, ${formatPct(item.p, 0)}`
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
