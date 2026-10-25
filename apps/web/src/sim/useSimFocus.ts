import { useEffect, useRef, type RefObject } from 'react'
import type { Mode, Phase, ReadingSource } from '@/state/types'
import { focusTarget, type FocusTarget } from './flow'

export type FocusRefs = Record<Exclude<FocusTarget, null>, RefObject<HTMLElement | null>>

interface FocusInputs {
  phase: Phase
  hasWarning: boolean
  mode: Mode
  lastSource: ReadingSource | null
}

/** Applies the focus rules from flow.ts after each phase change, once the target has rendered. */
export function useSimFocus(
  { phase, hasWarning, mode, lastSource }: FocusInputs,
  refs: FocusRefs,
): void {
  const prev = useRef<Phase>(phase)
  useEffect(() => {
    const target = focusTarget(prev.current, phase, { hasWarning, mode, lastSource })
    prev.current = phase
    if (!target) return
    const frame = window.requestAnimationFrame(() => refs[target].current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [phase, hasWarning, mode, lastSource, refs])
}
