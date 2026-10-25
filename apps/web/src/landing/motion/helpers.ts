import {
  BARS_STAGE_COUNT,
  DEVICE_POINTER_TILT_DEG,
  DEVICE_SCROLL_TILT_DEG,
  LATE_LOAD_MS,
  LINE_TOLERANCE_PX,
  PARALLAX_MAX_DEPTH,
  PARALLAX_MIN_DEPTH,
  STAT_MAX_DECIMALS,
} from './constants'

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

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}

/** Wobble amplitude as a fraction of its widest: 1 at progress 0, settled (0) at 1. */
export function wobbleAmplitude(progress: number): number {
  return 1 - clamp01(progress)
}

/**
 * Offset that moves the dot from where it rests to the hole nearest the page position. `holes` are
 * hole centres along the column in reading order; `rest` is the dot's centre with no offset.
 */
export function slideOffset(progress: number, holes: readonly number[], rest: number): number {
  const first = holes[0]
  const last = holes[holes.length - 1]
  if (first === undefined || last === undefined) return 0
  const wanted = first + clamp01(progress) * (last - first)
  const nearest = holes.reduce((best, hole) =>
    Math.abs(hole - wanted) < Math.abs(best - wanted) ? hole : best,
  )
  return nearest - rest
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

export type RevealVariant = 'up' | 'mask' | 'stagger'

/** `data-motion-reveal`; anything missing or unknown is the default rise. */
export function revealVariant(raw: string | null): RevealVariant {
  const value = raw?.trim()
  return value === 'mask' || value === 'stagger' ? value : 'up'
}

/** `data-motion-depth`, clamped to the contract's 0.05 to 0.3; null when not a positive number. */
export function parseDepth(raw: string | null): number | null {
  if (raw === null) return null
  const depth = strictNumber(raw)
  if (!Number.isFinite(depth) || depth <= 0) return null
  return Math.min(PARALLAX_MAX_DEPTH, Math.max(PARALLAX_MIN_DEPTH, depth))
}

/** Keeps a count between 0 and its target, so an overshooting ease never shows a larger number. */
export function clampCount(current: number, target: number): number {
  return Math.min(Math.max(current, Math.min(0, target)), Math.max(0, target))
}

/** Pointer position relative to the device centre, each axis -1..1. */
export interface PointerOffset {
  x: number
  y: number
}

export interface Tilt {
  rotationX: number
  rotationY: number
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(-1, value))
}

/**
 * Device tilt: tipped back at the top of its section, forward at the bottom, plus a lean toward
 * the pointer. The combined tilt never passes the scroll limit.
 */
export function deviceTilt(sectionProgress: number, pointer: PointerOffset | null): Tilt {
  const fromScroll = (1 - 2 * clamp01(sectionProgress)) * DEVICE_SCROLL_TILT_DEG
  const lean = pointer ?? { x: 0, y: 0 }
  const rotationX = fromScroll - clampUnit(lean.y) * DEVICE_POINTER_TILT_DEG
  // `+ 0` turns -0 into 0, so a level device reads as exactly 0.
  return {
    rotationX: Math.min(DEVICE_SCROLL_TILT_DEG, Math.max(-DEVICE_SCROLL_TILT_DEG, rotationX)) + 0,
    rotationY: clampUnit(lean.x) * DEVICE_POINTER_TILT_DEG + 0,
  }
}

/** True when the motion chunk ran after above-the-fold content had been painted for a while. */
export function arrivedLate(now: number = performance.now()): boolean {
  return now > LATE_LOAD_MS
}
