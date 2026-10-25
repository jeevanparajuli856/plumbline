import type { DomainId, ReadingEntry, SiteSpec } from '@/state/types'

export interface SceneLabelState {
  domain: DomainId
  sites: readonly SiteSpec[]
  aimedSite: number | null
  readings: ReadonlyArray<Pick<ReadingEntry, 'toldSite' | 'landedSite'>>
}

const TAIL = 'All information is also in the text channel.'

/**
 * The Canvas wrapper's aria-label: what the scene shows right now, never a percentage. It is not
 * a live region, so changing it announces nothing; the announcer stays the only event mirror.
 */
export function sceneLabel(state: SceneLabelState): string {
  const head =
    state.domain === 'thermometer'
      ? '3D cross-section of the simulated roast.'
      : '3D view of the breadboard.'
  const label = (site: number | null | undefined) =>
    site === null || site === undefined ? undefined : state.sites[site]?.label
  const last = state.readings[state.readings.length - 1]
  const told = label(last?.toldSite)
  const landed = label(last?.landedSite)
  if (told && landed) return `${head} Told ${told}; the probe landed on ${landed}. ${TAIL}`
  const aimed = label(state.aimedSite)
  return aimed ? `${head} Probe aimed at ${aimed}. ${TAIL}` : `${head} ${TAIL}`
}
