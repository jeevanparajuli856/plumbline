import { formatPct } from '@/lib/format'
import type { DomainId, DomainSpec } from './types'

/** Words per instrument. Spoken and screen-reader text come from the same functions. */
export const DOMAINS: Record<DomainId, DomainSpec> = {
  circuit: {
    id: 'circuit',
    title: 'Breadboard circuit',
    simulated: false,
    siteNoun: 'row',
    unit: 'V',
    unitSpoken: 'volts',
    readingDecimals: 3,
    readingRange: [-1, 12],
    phrases: {
      instruction: (site) => `Touch the red probe to ${site.spoken}. Say or type the reading.`,
      accepted: (value) => `${value.toFixed(3)} volts, accepted.`,
      warning: (told, likely, pOff) =>
        `Warning. That reading did not come from ${told.spoken}. It most likely came from ${likely.spoken}, probability ${formatPct(pOff, 0)}. Please try ${told.spoken} again.`,
      likely: (likely, p) => `Most likely from ${likely.spoken}, ${formatPct(p, 0)}.`,
      diagnosis: (fault, confidence) => `${fault.spoken}. Confidence ${formatPct(confidence, 0)}.`,
      unresolved: (pair) =>
        `I cannot separate ${pair.map((h) => h.spoken).join(' from ')} from voltages alone. I will not guess.`,
    },
  },
  thermometer: {
    id: 'thermometer',
    title: 'Probe thermometer (simulated roast)',
    simulated: true,
    siteNoun: 'depth',
    unit: '°C',
    unitSpoken: 'degrees Celsius',
    readingDecimals: 1,
    readingRange: [-10, 150],
    phrases: {
      instruction: (site) => `Insert the probe to ${site.spoken}. Say or type the temperature.`,
      accepted: (value) => `${value.toFixed(1)} degrees Celsius, accepted.`,
      warning: (told, likely, pOff) =>
        `Warning. That reading did not come from ${told.spoken}. It most likely came from ${likely.spoken}, probability ${formatPct(pOff, 0)}. Please try ${told.spoken} again.`,
      likely: (likely, p) => `Most likely from ${likely.spoken}, ${formatPct(p, 0)}.`,
      diagnosis: (cls, confidence) =>
        `Simulated model. ${cls.spoken}. Confidence ${formatPct(confidence, 0)}.`,
      unresolved: (pair) =>
        `I cannot separate ${pair.map((h) => h.spoken).join(' from ')} from temperatures alone. I will not guess.`,
    },
  },
}
