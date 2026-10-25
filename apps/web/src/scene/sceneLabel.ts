import type { SessionState } from '@/state/types'
import { landedSite, toldSite } from './selectors'

/**
 * The aria-label of the scene's role="img" wrapper. It names where the probe is, never belief:
 * the text channel owns the numbers. Not live, so it never announces; a screen reader that
 * lands on the image hears the current state.
 */
const SCENE_NAME = {
  circuit: '3D view of the breadboard.',
  thermometer: '3D cross-section of the simulated roast.',
} as const
const TEXT_CHANNEL = 'All information is also in the text channel.'

function siteLabel(s: SessionState, site: number): string {
  return s.catalog?.sites[site]?.label ?? `row ${site + 1}`
}

function probeSentence(s: SessionState): string | null {
  const landed = landedSite(s)
  const last = s.readings[s.readings.length - 1]
  if (landed !== null && last) {
    return `Told ${siteLabel(s, last.toldSite)}; the probe landed on ${siteLabel(s, landed)}.`
  }
  // Mid-reveal the store already aims at the next instruction; name the reading in flight.
  const aimed = s.phase === 'revealing' ? toldSite(s) : (s.aimedSite ?? toldSite(s))
  if (aimed === null || !s.catalog) return null
  return `Probe aimed at ${siteLabel(s, aimed)}.`
}

export function sceneLabel(s: SessionState): string {
  return [SCENE_NAME[s.domain], probeSentence(s), TEXT_CHANNEL].filter(Boolean).join(' ')
}
