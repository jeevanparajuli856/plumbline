import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** Same lookup order as `src/state/replay.ts`: recorded parity fixture, then the provisional one. */
const RECORDED_DIR = fileURLToPath(new URL('../../../../engine/fixtures/parity/', import.meta.url))
const PROVISIONAL_DIR = fileURLToPath(new URL('../../src/fixtures/provisional/', import.meta.url))

export interface FixtureStep {
  index: number
  told_site: number
  reading: number
  landed_site: number | null
  warning: boolean
  status: 'continue' | 'resolved' | 'unresolved'
  diagnosis: { hypothesis_id: string; confidence: number } | null
  baseline: { top: string; confidence: number }
  unresolved?: { classes: string[][]; reason: string; text: string } | null
}

export interface FixtureFile {
  name: string
  domain: 'circuit' | 'thermometer'
  provisional?: boolean
  generated_by?: string | null
  catalog: { hypothesis_ids: string[]; hypothesis_labels?: string[]; site_labels: string[] }
  prior_instruction: { site: number }
  steps: FixtureStep[]
}

export function recordedFixtureExists(name: string): boolean {
  return existsSync(`${RECORDED_DIR}${name}.json`)
}

/** Returns the fixture the app will replay, or null when neither a recorded nor provisional file exists. */
export function readFixture(name: string): FixtureFile | null {
  for (const dir of [RECORDED_DIR, PROVISIONAL_DIR]) {
    const path = `${dir}${name}.json`
    if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8')) as FixtureFile
  }
  return null
}

export function isProvisional(fx: FixtureFile): boolean {
  return Boolean(fx.provisional) || !fx.generated_by
}

export function labelOf(fx: FixtureFile, hypothesisId: string): string {
  const i = fx.catalog.hypothesis_ids.indexOf(hypothesisId)
  return fx.catalog.hypothesis_labels?.[i] ?? hypothesisId.replace(/_/g, ' ')
}

export function siteLabel(fx: FixtureFile, site: number): string {
  return fx.catalog.site_labels[site] ?? `site ${site + 1}`
}
