/**
 * Pure scroll geometry for the landing. The hook measures rects; these functions turn them into
 * the one progress scalar and the snap target. No DOM access here, so all of it is unit-tested.
 */
import type { LandingSection } from '@/state/landing'
import { BAND, SECTION_ORDER } from './choreography'

export interface SectionBox {
  id: LandingSection
  /** Section rect relative to the viewport (getBoundingClientRect). */
  top: number
  height: number
  /** The sticky track inside the section, when one is pinned right now. */
  track?: { top: number; height: number }
}

export type SectionKind = 'first' | 'last' | 'flow'


function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0
  return Math.min(1, Math.max(0, x))
}

/**
 * Fraction through a section in normal flow, measured against the viewport's center line.
 * The first section starts at scroll 0 and the last one ends at the bottom of the document,
 * so progress reaches exactly 0 and 1 and stays continuous across section boundaries.
 */
export function flowFraction(top: number, height: number, vh: number, kind: SectionKind): number {
  const center = vh / 2
  if (height <= 0) return 0
  if (kind === 'first') return clamp01(-top / Math.max(1, height - center))
  if (kind === 'last') return clamp01((center - top) / Math.max(1, height - center))
  return clamp01((center - top) / height)
}

/** Fraction through a pinned track: 0 when its top meets the viewport top, 1 when its bottom meets the bottom. */
export function trackFraction(top: number, height: number, vh: number): number {
  const travel = height - vh
  if (travel <= 0) return clamp01((vh / 2 - top) / Math.max(1, height))
  return clamp01(-top / travel)
}

/** The section under the viewport's center line; above the first section it is the first one. */
export function currentIndex(boxes: readonly SectionBox[], vh: number): number {
  const center = vh / 2
  let index = 0
  boxes.forEach((b, i) => {
    if (b.top <= center) index = i
  })
  return index
}

export interface ProgressReading {
  progress: number
  section: LandingSection
  f: number
}

/** One progress scalar for the page: (section index + fraction) / section count. */
export function computeProgress(boxes: readonly SectionBox[], vh: number): ProgressReading {
  if (boxes.length === 0) return { progress: 0, section: SECTION_ORDER[0]!, f: 0 }
  const i = currentIndex(boxes, vh)
  const box = boxes[i]!
  const kind: SectionKind = i === 0 ? 'first' : i === boxes.length - 1 ? 'last' : 'flow'
  const f = box.track
    ? trackFraction(box.track.top, box.track.height, vh)
    : flowFraction(box.top, box.height, vh, kind)
  const order = Math.max(0, SECTION_ORDER.indexOf(box.id))
  return { progress: Math.min(1, (order + f) * BAND), section: box.id, f }
}

