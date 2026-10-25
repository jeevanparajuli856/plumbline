import type { FixtureT } from '@/engine/schemas'
import { formatPct, formatReading } from '@/lib/format'
import { DOMAINS } from '@/state/domains'
import { frameAt, siteLabel } from './workedExample'

export interface StepsRun {
  instruction: string
  reading: string
  siteCount: number
  told: number
  likely: number | null
  likelyLabel: string | null
  diagnosis: { label: string; pct: string; p: number } | null
}

function argmax(xs: readonly number[]): number {
  return xs.reduce((best, x, i) => (x > (xs[best] ?? -Infinity) ? i : best), 0)
}

/** What the four step screens show, read from the recording. Nothing typed by hand. */
export function stepsRun(fx: FixtureT): StepsRun | null {
  const first = fx.steps[0]
  if (!first) return null
  const end = frameAt(fx, fx.steps.length)
  const likely = first.warning ? argmax(first.placement) : null
  return {
    instruction: `Touch the red probe to ${siteLabel(fx, first.told_site)}.`,
    reading: formatReading(first.reading, DOMAINS[fx.domain]),
    siteCount: fx.catalog.site_labels.length,
    told: first.told_site,
    likely,
    likelyLabel: likely === null ? null : siteLabel(fx, likely),
    diagnosis: end.diagnosis
      ? { label: end.diagnosis.label, pct: formatPct(end.diagnosis.p), p: end.diagnosis.p }
      : null,
  }
}

/** The screen-reader twin of the four drawings. */
export function stepsCaption(run: StepsRun): string {
  const parts = [
    `Example from a recorded run with a simulated hand. Instruction: ${run.instruction}`,
    `Reading: ${run.reading}.`,
  ]
  if (run.likelyLabel)
    parts.push(`Truehand warned that the probe most likely touched ${run.likelyLabel}.`)
  if (run.diagnosis) parts.push(`It then named ${run.diagnosis.label}, ${run.diagnosis.pct}.`)
  return parts.join(' ')
}
