import { describe, expect, it } from 'vitest'
import type { Catalog } from '@/state/types'
import { focusTarget, headingFor } from './flow'

const catalog: Catalog = {
  domain: 'circuit',
  simulated: false,
  readingUnit: 'V',
  sigma: 0.02,
  hypotheses: [],
  sites: [0, 1, 2].map((index) => ({
    index,
    label: `row ${index + 1}`,
    spoken: `row ${index + 1}`,
  })),
  classes: [],
}

const base = {
  domain: 'circuit' as const,
  phase: 'awaiting_reading' as const,
  catalog,
  instruction: { site: 2, label: 'row 3', spoken: 'row 3', gainBits: [] },
  diagnosis: null,
  error: null,
}

describe('headingFor', () => {
  it('shows the instruction command with its follow-up while awaiting', () => {
    expect(headingFor(base)).toEqual({
      title: 'Touch the red probe to row 3.',
      sub: 'Say or type the reading.',
      isInstruction: true,
    })
  })

  it('shows the diagnosis once resolved', () => {
    const h = headingFor({
      ...base,
      phase: 'resolved',
      instruction: null,
      diagnosis: {
        hypothesisId: 'x',
        label: 'R3 is ten times too small',
        confidence: 0.975,
        spoken: '',
      },
    })
    expect(h).toEqual({ title: 'R3 is ten times too small.', sub: '', isInstruction: false })
  })

  it('says unresolved instead of picking a fault', () => {
    expect(headingFor({ ...base, phase: 'unresolved', instruction: null }).title).toContain(
      'Unresolved',
    )
  })

  it('falls back to the error sentence or a loading line', () => {
    const err = headingFor({
      ...base,
      phase: 'error',
      instruction: null,
      error: {
        code: 'session_lost',
        sentence: 'The session ended.',
        canRetry: true,
        resumePhase: 'idle',
      },
    })
    expect(err).toEqual({
      title: 'The session stopped.',
      sub: 'The session ended.',
      isInstruction: false,
    })
    expect(headingFor({ ...base, phase: 'starting', instruction: null, catalog: null }).title).toBe(
      'Loading the session.',
    )
  })
})

describe('focusTarget', () => {
  const ctx = { hasWarning: false, mode: 'live' as const, lastSource: 'typed' as const }

  it('moves to the outcome on resolved and unresolved, and to the sentence on error', () => {
    expect(focusTarget('revealing', 'resolved', ctx)).toBe('diagnosis')
    expect(focusTarget('submitting', 'unresolved', ctx)).toBe('refusal')
    expect(focusTarget('submitting', 'error', ctx)).toBe('error')
  })

  it('moves to the warning after a reading that raised one', () => {
    expect(
      focusTarget('revealing', 'awaiting_reading', {
        ...ctx,
        hasWarning: true,
        lastSource: 'replay',
      }),
    ).toBe('warning')
  })

  it('returns to the input after a typed reading, but not after a replay step', () => {
    expect(focusTarget('submitting', 'awaiting_reading', ctx)).toBe('input')
    expect(
      focusTarget('submitting', 'awaiting_reading', {
        ...ctx,
        mode: 'replay',
        lastSource: 'replay',
      }),
    ).toBeNull()
  })

  it('leaves focus alone on start, on no change and on intermediate phases', () => {
    expect(focusTarget('starting', 'awaiting_reading', ctx)).toBeNull()
    expect(focusTarget('awaiting_reading', 'awaiting_reading', ctx)).toBeNull()
    expect(focusTarget('awaiting_reading', 'submitting', ctx)).toBeNull()
  })
})
