import { DOMAINS } from '@/state/domains'
import type { Mode, Phase, ReadingSource, SessionData } from '@/state/types'
import { splitFirstSentence } from './view'

export interface Heading {
  title: string
  sub: string
  /** True when the heading is the instruction (the contract's data-testid="instruction"). */
  isInstruction: boolean
}

type HeadingInput = Pick<
  SessionData,
  'domain' | 'phase' | 'catalog' | 'instruction' | 'diagnosis' | 'error'
>

/** The h1 is always the one thing to do or know now (POSITIONING 5). */
export function headingFor(state: HeadingInput): Heading {
  const { phase, catalog, instruction, diagnosis } = state
  if (phase === 'resolved' && diagnosis)
    return { title: `${diagnosis.label}.`, sub: '', isInstruction: false }
  if (phase === 'unresolved')
    return { title: 'Unresolved. Two faults look the same here.', sub: '', isInstruction: false }
  const site = instruction && catalog ? catalog.sites[instruction.site] : undefined
  if (site) {
    const [title, sub] = splitFirstSentence(DOMAINS[state.domain].phrases.instruction(site))
    return { title, sub, isInstruction: true }
  }
  if (phase === 'error')
    return { title: 'The session stopped.', sub: state.error?.sentence ?? '', isInstruction: false }
  return { title: 'Loading the session.', sub: '', isInstruction: false }
}

export type FocusTarget = 'warning' | 'input' | 'diagnosis' | 'refusal' | 'error' | null

interface FocusContext {
  hasWarning: boolean
  mode: Mode
  lastSource: ReadingSource | null
}

/**
 * Where focus goes after a phase change (ARCHITECTURE 10). Replay stepped from a button or key
 * keeps focus where it is, so ] and P keep working instead of landing in the text field.
 */
export function focusTarget(prev: Phase, next: Phase, ctx: FocusContext): FocusTarget {
  if (prev === next) return null
  if (next === 'resolved') return 'diagnosis'
  if (next === 'unresolved') return 'refusal'
  if (next === 'error') return 'error'
  if (next !== 'awaiting_reading') return null
  if (prev !== 'submitting' && prev !== 'revealing') return null
  if (ctx.hasWarning) return 'warning'
  const steppedByReplay = ctx.lastSource === 'replay'
  return steppedByReplay ? null : 'input'
}
