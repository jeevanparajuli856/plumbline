import { STICKY_STATES, progressOf } from './choreography'
import {
  computeProgress,
  currentIndex,
  flowFraction,
  snapTarget,
  trackFraction,
  type SectionBox,
} from './scrollMath'

const VH = 800

describe('flowFraction', () => {
  it('starts the first section at 0 when the page is at the top', () => {
    expect(flowFraction(0, VH, VH, 'first')).toBe(0)
  })

  it('finishes the first section when its bottom crosses the center line', () => {
    expect(flowFraction(VH / 2 - VH, VH, VH, 'first')).toBeCloseTo(1, 9)
  })

  it('measures a middle section by the center line', () => {
    expect(flowFraction(VH / 2, 1000, VH, 'flow')).toBe(0)
    expect(flowFraction(VH / 2 - 500, 1000, VH, 'flow')).toBeCloseTo(0.5, 9)
  })

  it('finishes the last section when it reaches the bottom of the document', () => {
    const height = 640
    expect(flowFraction(VH - height, height, VH, 'last')).toBeCloseTo(1, 9)
  })

  it('clamps and survives zero heights', () => {
    expect(flowFraction(-5000, 100, VH, 'flow')).toBe(1)
    expect(flowFraction(5000, 100, VH, 'flow')).toBe(0)
    expect(flowFraction(0, 0, VH, 'flow')).toBe(0)
  })
})

describe('trackFraction', () => {
  it('is 0 at pin start and 1 at pin end', () => {
    expect(trackFraction(0, 3 * VH, VH)).toBe(0)
    expect(trackFraction(-VH, 3 * VH, VH)).toBeCloseTo(0.5, 9)
    expect(trackFraction(-2 * VH, 3 * VH, VH)).toBe(1)
  })

  it('falls back to the center line when the track is not taller than the viewport', () => {
    expect(trackFraction(VH / 2, VH / 2, VH)).toBe(0)
  })
})

describe('computeProgress', () => {
  const boxes = (scroll: number): SectionBox[] => {
    let y = 0
    const heights: Array<[SectionBox['id'], number, boolean]> = [
      ['mast', VH, false],
      ['research', 1.2 * VH, false],
      ['problem', VH, false],
      ['play', 3 * VH, true],
      ['how', 2.5 * VH, true],
      ['generalize', 2 * VH, true],
      ['product', VH, false],
      ['ladder', VH, false],
      ['evidence', 1.5 * VH, false],
      ['close', 0.8 * VH, false],
    ]
    return heights.map(([id, h, sticky]) => {
      const top = y - scroll
      y += h
      return sticky ? { id, top, height: h, track: { top, height: h } } : { id, top, height: h }
    })
  }
  const total = VH * (1 + 1.2 + 1 + 3 + 2.5 + 2 + 1 + 1 + 1.5 + 0.8)

  it('is 0 at the top and 1 at the bottom of the document', () => {
    expect(computeProgress(boxes(0), VH)).toEqual({ progress: 0, section: 'mast', f: 0 })
    const end = computeProgress(boxes(total - VH), VH)
    expect(end.section).toBe('close')
    expect(end.progress).toBeCloseTo(1, 9)
  })

  it('never decreases as the page scrolls down', () => {
    let last = -1
    for (let s = 0; s <= total - VH; s += 10) {
      const { progress } = computeProgress(boxes(s), VH)
      expect(progress).toBeGreaterThanOrEqual(last - 1e-9)
      last = progress
    }
  })

  it('reports the pinned fraction of a sticky track', () => {
    const playTop = VH * (1 + 1.2 + 1)
    const r = computeProgress(boxes(playTop + VH), VH)
    expect(r.section).toBe('play')
    expect(r.progress).toBeCloseTo(progressOf('play', 0.5), 9)
  })

  it('returns the first section for an empty page', () => {
    expect(computeProgress([], VH).progress).toBe(0)
  })

  it('picks the section under the center line', () => {
    expect(currentIndex(boxes(0), VH)).toBe(0)
    expect(currentIndex(boxes(VH), VH)).toBe(1)
  })
})

describe('snapTarget', () => {
  const track = (scrollIntoTrack: number) => ({ top: -scrollIntoTrack, height: 3 * VH })

  it('snaps a resting track to the nearest named state', () => {
    const scrollY = 5000
    const r = snapTarget(scrollY, track(0.6 * 2 * VH), VH, STICKY_STATES.play)
    expect(r?.state).toBe('landed')
    expect(r?.scrollY).toBe(Math.round(scrollY - 0.6 * 2 * VH + (2 / 3) * 2 * VH))
  })

  it('leaves the reader alone at the ends of the track', () => {
    expect(snapTarget(0, track(0), VH, STICKY_STATES.play)).toBeNull()
    expect(snapTarget(0, track(2 * VH), VH, STICKY_STATES.play)).toBeNull()
  })

  it('does nothing inside the deadband or for short tracks', () => {
    expect(snapTarget(0, track((1 / 3) * 2 * VH + 1), VH, STICKY_STATES.play)).toBeNull()
    expect(snapTarget(0, { top: -10, height: VH }, VH, STICKY_STATES.play)).toBeNull()
  })
})
