/**
 * What the Truehand app screen shows inside the iPhone preview, from either source: a recorded
 * frame (the hero loop) or the live session store. Pure, so both mappings are unit-tested.
 */
import type { HeroFrame } from '../heroFrame'

export interface AppScreenView {
  /** Small chip beside the large title, e.g. "Simulated run". */
  mode: string
  /** "Reading 1 of 2" or "Ready". */
  step: string
  /** The current instruction, one sentence: "Touch the red probe to row 3." */
  instruction: string
  reading: { digits: string; unit: string } | null
  /** The warning sentence after the word "Warning.", when the recording warns. */
  warning: string | null
  verdict:
    { kind: 'resolved'; label: string; p: number } | { kind: 'unresolved'; text: string } | null
  belief: ReadonlyArray<{ label: string; p: number }>
}

/** Rows in the screen's belief list. */
export const SCREEN_BELIEF_ROWS = 3
/** Chip on every recorded run: the hand in these recordings is simulated. */
export const SIMULATED_MODE = 'Simulated run'

/** The first sentence of a domain instruction, without "Say or type the reading." */
export function firstSentence(text: string): string {
  const first = text.split('. ')[0] ?? text
  return first.endsWith('.') ? first : `${first}.`
}

export function viewFromFrame(f: HeroFrame): AppScreenView {
  const verdict = f.unresolvedText
    ? ({ kind: 'unresolved', text: f.unresolvedText } as const)
    : f.diagnosis && f.isResolved
      ? ({ kind: 'resolved', label: f.diagnosis.label, p: f.diagnosis.p } as const)
      : null
  return {
    mode: SIMULATED_MODE,
    step: f.readingsShown === 0 ? 'Ready' : `Reading ${f.readingsShown} of ${f.stepCount}`,
    instruction: firstSentence(f.instruction),
    reading: f.readingDigits ? { digits: f.readingDigits, unit: f.unit } : null,
    warning: f.warning
      ? `Your probe is not where you think it is. Most likely ${f.warning.likelyLabel}.`
      : null,
    verdict,
    belief: f.truehand.slice(0, SCREEN_BELIEF_ROWS).map((h) => ({ label: h.label, p: h.p })),
  }
}

export interface SessionSnapshot {
  phase: string
  instruction: string | null
  readingsCount: number
  lastReading: { digits: string; unit: string } | null
  warningText: string | null
  diagnosis: { label: string; confidence: number } | null
  unresolvedText: string | null
  belief: ReadonlyArray<{ label: string; p: number }>
}

export function viewFromSession(st: SessionSnapshot): AppScreenView {
  const verdict =
    st.phase === 'resolved' && st.diagnosis
      ? ({ kind: 'resolved', label: st.diagnosis.label, p: st.diagnosis.confidence } as const)
      : st.phase === 'unresolved' && st.unresolvedText
        ? ({ kind: 'unresolved', text: st.unresolvedText } as const)
        : null
  return {
    mode: SIMULATED_MODE,
    step: st.readingsCount === 0 ? 'Ready' : `Reading ${st.readingsCount}`,
    instruction: st.instruction ? firstSentence(st.instruction) : 'Loading.',
    reading: st.lastReading,
    warning:
      st.warningText && st.phase !== 'resolved'
        ? st.warningText.replace(/^Warning\.\s*/, '')
        : null,
    verdict,
    belief: [...st.belief].sort((a, b) => b.p - a.p).slice(0, SCREEN_BELIEF_ROWS),
  }
}
