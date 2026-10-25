import { BARS_STAGE_COUNT, LINE_TOLERANCE_PX, MAX_SWING_DEG, STAT_MAX_DECIMALS } from './constants'

export type Stages = readonly [number, number, number]

export interface StatSpec {
  value: number
  decimals: number
  suffix: string
}

function strictNumber(raw: string): number {
  const trimmed = raw.trim()
  return trimmed === '' ? Number.NaN : Number(trimmed)
}

/** `data-motion-stages="p0,p1,p2"`: three probabilities in [0, 1], or null when anything is off. */
export function parseStages(raw: string | null): Stages | null {
  if (raw === null) return null
  const parts = raw.split(',').map(strictNumber)
  if (parts.length !== BARS_STAGE_COUNT) return null
  if (!parts.every((p) => Number.isFinite(p) && p >= 0 && p <= 1)) return null
  return parts as unknown as Stages
}

/** Reads the stat hook attributes; null when the value or the decimals are not usable. */
export function parseStat(
  value: string | null,
  decimals: string | null,
  suffix: string | null,
): StatSpec | null {
  if (value === null) return null
  const v = strictNumber(value)
  const d = decimals === null ? 0 : strictNumber(decimals)
  if (!Number.isFinite(v)) return null
  if (!Number.isInteger(d) || d < 0 || d > STAT_MAX_DECIMALS) return null
  return { value: v, decimals: d, suffix: suffix ?? '' }
}

export function formatStat(current: number, spec: StatSpec): string {
  return `${current.toFixed(spec.decimals)}${spec.suffix}`
}

/** Swing half-angle in degrees: widest at progress 0, settled at 1. */
export function swingAmplitude(progress: number): number {
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0
  return MAX_SWING_DEG * (1 - p)
}

/** Line index for each word, from the words' offsetTop in reading order. */
export function groupByLine(tops: readonly number[]): number[] {
  let line = 0
  let lineTop = tops[0] ?? 0
  return tops.map((top) => {
    if (Math.abs(top - lineTop) > LINE_TOLERANCE_PX) {
      line += 1
      lineTop = top
    }
    return line
  })
}
