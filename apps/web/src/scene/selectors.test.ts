import { describe, expect, it } from 'vitest'
import { useSession } from '@/state/session'
import type { ReadingEntry, SessionState } from '@/state/types'
import {
  bracketRows,
  landedSite,
  plumbCandidates,
  plumbRestParts,
  toldSite,
  warningSite,
} from './selectors'

const reading = (over: Partial<ReadingEntry> = {}): ReadingEntry => ({
  step: 0,
  toldSite: 2,
  value: 3.671,
  source: 'replay',
  placement: [0, 1, 0, 0, 0, 0],
  warning: null,
  entropyBits: 1,
  top: [],
  acceptedAt: 0,
  ...over,
})

const state = (over: Partial<SessionState>): SessionState => ({
  ...useSession.getInitialState(),
  ...over,
})

const instruction = (site: number) => ({ site, label: `row ${site + 1}`, spoken: '', gainBits: [] })
const warning = { toldSite: 2, likelySite: 1, pOffSite: 1, text: 'Warning.' }

describe('scene selectors', () => {
  it('uses the last reading as the told row during a reveal, not the next instruction', () => {
    const s = state({ phase: 'revealing', instruction: instruction(4), readings: [reading()] })
    expect(toldSite(s)).toBe(2)
    expect(toldSite({ ...s, phase: 'awaiting_reading' })).toBe(4)
    expect(toldSite(state({ phase: 'idle' }))).toBeNull()
  })

  it('never exposes the landed row or the warning while revealing', () => {
    const r = reading({ landedSite: 1, warning })
    const revealing = state({ phase: 'revealing', warning, readings: [r] })
    expect(landedSite(revealing)).toBeNull()
    expect(warningSite(revealing)).toBeNull()
    const after = { ...revealing, phase: 'awaiting_reading' as const }
    expect(landedSite(after)).toBe(1)
    expect(warningSite(after)).toBe(2)
  })

  it('has no landed row before finishReveal wrote it', () => {
    expect(landedSite(state({ phase: 'awaiting_reading', readings: [reading()] }))).toBeNull()
  })

  it('points the plumb line at the diagnosed part', () => {
    const diagnosis = { hypothesisId: 'R3_10x_low', label: '', confidence: 0.975, spoken: '' }
    expect(plumbCandidates(state({ phase: 'resolved', diagnosis }))).toEqual(['R3'])
    expect(plumbCandidates(state({ phase: 'awaiting_reading', diagnosis }))).toEqual([])
    const nominal = { ...diagnosis, hypothesisId: 'nominal' }
    expect(plumbCandidates(state({ phase: 'resolved', diagnosis: nominal }))).toEqual([])
  })

  it('collapses unresolved candidates to distinct parts, at most two', () => {
    const unresolved = (classes: string[][]) => ({
      classes,
      reason: 'indistinguishable' as const,
      text: '',
    })
    const led = state({
      phase: 'unresolved',
      unresolved: unresolved([['LED_open', 'LED_reversed']]),
    })
    expect(plumbCandidates(led)).toEqual(['D1'])
    const pair = state({
      phase: 'unresolved',
      unresolved: unresolved([['R7_short'], ['R3_open'], ['R1_open']]),
    })
    expect(plumbCandidates(pair)).toEqual(['R7', 'R3'])
  })

  it('brackets told row +/- 2, clamped to the board, while awaiting a reading', () => {
    expect(bracketRows(state({ phase: 'awaiting_reading', instruction: instruction(2) }))).toEqual([
      0, 4,
    ])
    expect(bracketRows(state({ phase: 'awaiting_reading', instruction: instruction(5) }))).toEqual([
      3, 5,
    ])
    expect(bracketRows(state({ phase: 'resolved', instruction: instruction(2) }))).toBeNull()
  })

  it('brackets the rows the unresolved parts touch', () => {
    const s = state({
      phase: 'unresolved',
      unresolved: {
        classes: [['LED_open', 'LED_reversed']],
        reason: 'indistinguishable',
        text: '',
      },
    })
    expect(bracketRows(s)).toEqual([3, 4])
  })
})

describe('plumbRestParts', () => {
  it('cycles every candidate normally and points at the first one under reduced motion', () => {
    expect(plumbRestParts(['R7', 'R3'], false)).toEqual(['R7', 'R3'])
    expect(plumbRestParts(['R7', 'R3'], true)).toEqual(['R7'])
    expect(plumbRestParts([], true)).toEqual([])
  })
})
