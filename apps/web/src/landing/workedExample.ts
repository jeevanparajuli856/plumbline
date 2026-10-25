/**
 * Turns a recorded fixture into the words and numbers the landing shows. Nothing here is typed
 * by hand: every reading, row, percentage and threshold comes from the fixture passed in.
 */
import type { FixtureT } from '@/engine/schemas'
import { formatPct } from '@/lib/format'
import { DOMAINS } from '@/state/domains'

export interface RankedHypothesis {
  id: string
  label: string
  p: number
}

export interface TranscriptItem {
  key: string
  kind: 'start' | 'reading' | 'warning' | 'belief' | 'diagnosis' | 'unresolved'
  text: string
}

export interface ComparisonRow {
  step: number
  reading: string
  told: string
  landed: string
  plumbline: RankedHypothesis & { isTrue: boolean }
  published: RankedHypothesis & { isTrue: boolean }
}

export interface PlayFrame {
  readingsShown: number
  told: number
  toldLabel: string
  landed: number | null
  landedLabel: string | null
  reading: string | null
  warning: { likelyLabel: string; pOff: number } | null
  plumbline: RankedHypothesis[]
  published: RankedHypothesis | null
  entropyBits: number
  maxEntropyBits: number
  hypothesisCount: number
  diagnosis: RankedHypothesis | null
  isResolved: boolean
}

export interface FixtureConfig {
  sigma: number | null
  pSame: number | null
  pPm1: number | null
  pPm2: number | null
  warningThreshold: number | null
  resolveThreshold: number | null
}

const TOP_K = 3

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** The fixture's config is free-form JSON; read only the fields the landing names. */
export function fixtureConfig(fx: FixtureT): FixtureConfig {
  const c = fx.config
  const confusion = (
    typeof c.confusion === 'object' && c.confusion !== null ? c.confusion : {}
  ) as Record<string, unknown>
  return {
    sigma: num(c.sigma),
    pSame: num(confusion.p_same),
    pPm1: num(confusion.p_pm1),
    pPm2: num(confusion.p_pm2),
    warningThreshold: num(c.warning_threshold),
    resolveThreshold: num(c.resolve_threshold),
  }
}

export function labelOf(fx: FixtureT, id: string): string {
  const i = fx.catalog.hypothesis_ids.indexOf(id)
  return fx.catalog.hypothesis_labels?.[i] ?? id.replace(/_/g, ' ')
}

export function siteLabel(fx: FixtureT, site: number): string {
  return fx.catalog.site_labels[site] ?? `site ${site + 1}`
}

export function formatValue(fx: FixtureT, value: number): string {
  const spec = DOMAINS[fx.domain]
  return `${value.toFixed(spec.readingDecimals)} ${spec.unitSpoken}`
}

export function rank(fx: FixtureT, belief: readonly number[], k = TOP_K): RankedHypothesis[] {
  return belief
    .map((p, i) => ({ id: fx.catalog.hypothesis_ids[i] ?? String(i), p }))
    .sort((a, b) => b.p - a.p)
    .slice(0, k)
    .map((h) => ({ ...h, label: labelOf(fx, h.id) }))
}

export function maxEntropy(fx: FixtureT): number {
  const n = fx.catalog.hypothesis_ids.length
  return n > 0 ? Math.log2(n) : 0
}

function argmax(xs: readonly number[]): number {
  return xs.reduce((best, x, i) => (x > (xs[best] ?? -Infinity) ? i : best), 0)
}

function toldSiteOf(fx: FixtureT, index: number): number {
  return fx.steps[index]?.told_site ?? fx.prior_instruction.site
}

/** Confidence at or above this reads as "certain" in the transcript. */
const CERTAIN_AT = 0.95

function verdict(fx: FixtureT, baseline: { top: string; confidence: number }): string {
  if (baseline.top === fx.true_hypothesis) return ', correct.'
  return baseline.confidence >= CERTAIN_AT ? ', certain and wrong.' : ', wrong.'
}

function rankedText(list: readonly RankedHypothesis[]): string {
  return list.map((h) => `${h.label}, ${formatPct(h.p)}`).join('; ')
}

/** The always-present step list: a start line, then per reading what happened and what each method believes. */
export function transcript(fx: FixtureT): TranscriptItem[] {
  const n = fx.catalog.hypothesis_ids.length
  const items: TranscriptItem[] = [
    {
      key: 'start',
      kind: 'start',
      text: `Start. ${n} possible faults, all equally likely: uncertainty ${maxEntropy(fx).toFixed(2)} bits. Told: touch the red probe to ${siteLabel(fx, fx.prior_instruction.site)}.`,
    },
  ]
  fx.steps.forEach((step, i) => {
    const k = i + 1
    const landed = step.landed_site === null ? 'an unknown row' : siteLabel(fx, step.landed_site)
    items.push({
      key: `reading-${k}`,
      kind: 'reading',
      text: `Step ${k}. Told: touch ${siteLabel(fx, step.told_site)}. The hand lands on ${landed}. Reading: ${formatValue(fx, step.reading)}.`,
    })
    if (step.warning) {
      items.push({
        key: `warning-${k}`,
        kind: 'warning',
        text: `Warning. Your probe is not where you think it is. Most likely ${siteLabel(fx, argmax(step.placement))}. Chance it was not ${siteLabel(fx, step.told_site)}: ${formatPct(step.p_off_site)}.`,
      })
    }
    const published = `Published method: ${labelOf(fx, step.baseline.top)}, ${formatPct(step.baseline.confidence)}`
    if (step.diagnosis) {
      const isTrue = step.diagnosis.hypothesis_id === fx.true_hypothesis
      items.push({
        key: `diagnosis-${k}`,
        kind: 'diagnosis',
        text: `Plumbline: ${labelOf(fx, step.diagnosis.hypothesis_id)}, ${formatPct(step.diagnosis.confidence)}.${isTrue ? ' That is the true fault.' : ''} ${published}${verdict(fx, step.baseline)}`,
      })
    } else if (step.status === 'unresolved') {
      items.push({
        key: `unresolved-${k}`,
        kind: 'unresolved',
        text: `Unresolved. ${step.unresolved?.text ?? 'These faults give the same readings at every row.'} Plumbline asks for a different measurement instead of guessing.`,
      })
    } else {
      items.push({
        key: `belief-${k}`,
        kind: 'belief',
        text: `Plumbline: ${rankedText(rank(fx, step.belief, 2))}. Not sure yet, so it asks for another reading. ${published}${verdict(fx, step.baseline)}`,
      })
    }
  })
  return items
}

/** One row per reading: Plumbline's top candidate against the published method's, with the truth marked. */
export function comparisonRows(fx: FixtureT): ComparisonRow[] {
  return fx.steps.map((step, i) => {
    const top = rank(fx, step.belief, 1)[0]!
    return {
      step: i + 1,
      reading: formatValue(fx, step.reading),
      told: siteLabel(fx, step.told_site),
      landed: step.landed_site === null ? 'unknown' : siteLabel(fx, step.landed_site),
      plumbline: { ...top, isTrue: top.id === fx.true_hypothesis },
      published: {
        id: step.baseline.top,
        label: labelOf(fx, step.baseline.top),
        p: step.baseline.confidence,
        isTrue: step.baseline.top === fx.true_hypothesis,
      },
    }
  })
}

/**
 * What the play panel shows after `readingsShown` readings. While the last reading is still being
 * revealed the landed row stays hidden, as in /sim.
 */
export function frameAt(fx: FixtureT, readingsShown: number, revealed = true): PlayFrame {
  const shown = Math.max(0, Math.min(fx.steps.length, Math.floor(readingsShown)))
  const last = shown > 0 ? fx.steps[shown - 1]! : null
  const n = fx.catalog.hypothesis_ids.length
  const uniform = Array.from({ length: n }, () => 1 / Math.max(1, n))
  const told = last ? last.told_site : toldSiteOf(fx, 0)
  const landed = last && revealed ? last.landed_site : null
  const diagnosis = last?.diagnosis
    ? {
        id: last.diagnosis.hypothesis_id,
        label: labelOf(fx, last.diagnosis.hypothesis_id),
        p: last.diagnosis.confidence,
      }
    : null
  return {
    readingsShown: shown,
    told,
    toldLabel: siteLabel(fx, told),
    landed,
    landedLabel: landed === null ? null : siteLabel(fx, landed),
    reading: last ? formatValue(fx, last.reading) : null,
    warning:
      last?.warning && revealed
        ? { likelyLabel: siteLabel(fx, argmax(last.placement)), pOff: last.p_off_site }
        : null,
    plumbline: rank(fx, last ? last.belief : uniform),
    published: last
      ? {
          id: last.baseline.top,
          label: labelOf(fx, last.baseline.top),
          p: last.baseline.confidence,
        }
      : null,
    entropyBits: last ? last.entropy_bits : maxEntropy(fx),
    maxEntropyBits: maxEntropy(fx),
    hypothesisCount: n,
    diagnosis: revealed ? diagnosis : null,
    isResolved: revealed && last?.status === 'resolved',
  }
}

/** Fixture is provisional when flagged or when no engine command recorded it. */
export function isProvisional(fx: FixtureT): boolean {
  return fx.provisional || !fx.generated_by
}

/** Fault groups the physics cannot separate: classes with more than one member, labeled. */
export function unresolvedGroups(fx: FixtureT): RankedHypothesis[][] {
  return fx.catalog.classes
    .filter((c) => c.length > 1)
    .map((c) => c.map((id) => ({ id, label: labelOf(fx, id), p: 1 / c.length })))
}

/** Length of the commit hash shown to readers; the full one stays in the fixture. */
export const SHORT_SHA_LENGTH = 7

export interface Provenance {
  command: string
  sha: string | null
  date: string | null
}

/**
 * Who recorded a fixture, from which commit, on which day (rule F19). Read only from the
 * fixture's own fields; null while it is provisional, where the PROVISIONAL badge says so instead.
 */
export function provenance(fx: FixtureT): Provenance | null {
  if (isProvisional(fx) || !fx.generated_by) return null
  return {
    command: fx.generated_by,
    sha: fx.git_sha ? fx.git_sha.slice(0, SHORT_SHA_LENGTH) : null,
    date: fx.generated_at ? fx.generated_at.slice(0, 10) : null,
  }
}
