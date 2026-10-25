import { labelOf, readFixture, siteLabel, type FixtureFile } from './fixture'

/**
 * The worked example as the app will replay it. Specs read readings, rows and labels from here,
 * never from the brief, so a re-recorded fixture changes the expectations with it.
 */
export const WORKED: FixtureFile = (() => {
  const fx = readFixture('worked_example')
  if (!fx) throw new Error('No worked_example fixture (recorded or provisional) was found.')
  return fx
})()

const [slip, resolve] = WORKED.steps
if (!slip || !resolve?.diagnosis || slip.landed_site === null) {
  throw new Error('worked_example must have a slipped first step and a resolved second step.')
}

export const STORY = {
  toldLabel: siteLabel(WORKED, slip.told_site),
  landedLabel: siteLabel(WORKED, slip.landed_site),
  firstReading: String(slip.reading),
  secondReading: String(resolve.reading),
  baselineLabel: labelOf(WORKED, slip.baseline.top),
  diagnosisId: resolve.diagnosis.hypothesis_id,
  diagnosisLabel: labelOf(WORKED, resolve.diagnosis.hypothesis_id),
  diagnosisConfidence: resolve.diagnosis.confidence,
} as const
