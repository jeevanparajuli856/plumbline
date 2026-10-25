/**
 * What the hero instrument card and the phone preview show for one recording after some readings.
 * Every value comes from the recorded fixture through workedExample.ts; nothing is typed here.
 */
import type { FixtureT } from '@/engine/schemas'
import { DOMAINS } from '@/state/domains'
import { frameAt, labelOf, siteLabel, type PlayFrame } from './workedExample'

export interface HeroFrame extends PlayFrame {
  recordingName: string
  stepCount: number
  siteLabels: readonly string[]
  /** The reading's digits without the unit ("3.671"), or null before the first reading. */
  readingDigits: string | null
  unit: string
  /** The domain's instruction for the told site, e.g. "Touch the red probe to row 3. ..." */
  instruction: string
  /** The engine's refusal sentence when the run ended unresolved. */
  unresolvedText: string | null
  /** Members of the refused class, labeled, when unresolved. */
  unresolvedLabels: string[]
}

/** Reader-facing names for the recordings; ids never reach the page. */
const RECORDING_NAMES: Record<string, string> = {
  worked_example: 'the worked example',
  seed_1: 'practice run 1',
  seed_2: 'practice run 2',
  seed_3: 'practice run 3',
  seed_4: 'practice run 4',
  seed_5: 'practice run 5',
  unresolved_pair: 'two look-alike faults',
}

export function recordingName(id: string): string {
  return RECORDING_NAMES[id] ?? id.replace(/_/g, ' ')
}

export function heroFrame(fx: FixtureT, id: string, readings: number): HeroFrame {
  const frame = frameAt(fx, readings)
  const last = frame.readingsShown > 0 ? fx.steps[frame.readingsShown - 1] : undefined
  const spec = DOMAINS[fx.domain]
  const told = siteLabel(fx, frame.told)
  const isUnresolved = last?.status === 'unresolved'
  const refusedClass = isUnresolved
    ? (fx.catalog.classes.find((c) => c.length > 1 && c.includes(fx.true_hypothesis)) ?? [])
    : []
  return {
    ...frame,
    recordingName: recordingName(id),
    stepCount: fx.steps.length,
    siteLabels: fx.catalog.site_labels,
    readingDigits: last ? last.reading.toFixed(spec.readingDecimals) : null,
    unit: spec.unit,
    instruction: spec.phrases.instruction({ index: frame.told, label: told, spoken: told }),
    unresolvedText: isUnresolved ? (last?.unresolved?.text ?? 'Unresolved.') : null,
    unresolvedLabels: refusedClass.map((h) => labelOf(fx, h)),
  }
}

/** The card's text twin (UI_CONTRACT 5.2): recording, step, told row and reading in one sentence. */
export function heroCaption(f: HeroFrame): string {
  const head = `Recording ${f.recordingName}, simulated hand`
  if (f.readingsShown === 0 || f.reading === null) {
    return `${head}, before any reading: told ${f.toldLabel}, nothing measured yet.`
  }
  const where = f.landedLabel && f.landedLabel !== f.toldLabel ? `, landed ${f.landedLabel}` : ''
  const outcome = [
    f.warning && ' Warning: the probe is probably not on the told row.',
    f.unresolvedText && ' Unresolved: the physics cannot tell the remaining faults apart.',
    f.diagnosis && f.isResolved && ` Resolved: ${f.diagnosis.label}.`,
  ]
    .filter(Boolean)
    .join('')
  return `${head}, reading ${f.readingsShown} of ${f.stepCount}: told ${f.toldLabel}${where}, read ${f.reading}.${outcome}`
}
