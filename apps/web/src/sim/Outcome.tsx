import type { Ref } from 'react'
import { formatPct } from '@/lib/format'
import type { BaselineState, Diagnosis, HypothesisMeta, SessionError } from '@/state/types'
import { buttonClass } from '@/ui/button'
import { baselineName } from './view'

interface DiagnosisCardProps {
  diagnosis: Diagnosis
  readingCount: number
  baseline: BaselineState | null
  ref?: Ref<HTMLDivElement>
}

/** Resolved. Inferred, so cyan and outlined. Names the published method's answer on the same readings. */
export function DiagnosisCard({ diagnosis, readingCount, baseline, ref }: DiagnosisCardProps) {
  const other = baseline?.diagnosis
  return (
    <div
      ref={ref}
      role="region"
      aria-label="Diagnosis"
      tabIndex={-1}
      data-testid="diagnosis"
      className="rounded-hard border-2 border-inferred bg-surface-1 p-5 sm:p-6"
    >
      <p className="label-caps text-inferred">Diagnosis</p>
      <p className="mt-2 text-reading font-semibold">{diagnosis.label}</p>
      <p className="mt-1 font-mono tnum text-lg">
        Confidence {formatPct(diagnosis.confidence, 1)}
        <span className="text-text-2">
          {' '}
          after {readingCount === 1 ? '1 reading' : `${readingCount} readings`}
        </span>
      </p>
      {other && other.hypothesisId !== diagnosis.hypothesisId ? (
        <p className="mt-4 border-t border-hairline pt-4 text-text-2">
          On the same readings, the {baselineName(baseline.method).toLowerCase()} names{' '}
          <span className="font-medium text-text">{other.label}</span> at{' '}
          <span className="font-mono tnum">{formatPct(other.confidence, 1)}</span>, because it
          assumes the probe was where it was told.
        </p>
      ) : null}
    </div>
  )
}

interface RefusalPanelProps {
  text: string
  pair: readonly HypothesisMeta[]
  ref?: Ref<HTMLDivElement>
}

/** Unresolved. The refusal is a feature: it names the pair and does not pick one. */
export function RefusalPanel({ text, pair, ref }: RefusalPanelProps) {
  return (
    <div
      ref={ref}
      role="region"
      aria-label="Unresolved"
      tabIndex={-1}
      data-testid="unresolved"
      className="rounded-hard border-2 border-dashed border-inferred bg-surface-1 p-5 sm:p-6"
    >
      <p className="label-caps text-inferred">Unresolved</p>
      <p className="mt-2 text-lg font-medium">{text}</p>
      {pair.length > 1 ? (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Faults that look the same">
          {pair.map((h) => (
            <li key={h.id} className="rounded-hard border-2 border-inferred px-3 py-1 font-medium">
              {h.label}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-4 text-text-2">A different measurement, not a guess, is the way forward.</p>
    </div>
  )
}

interface ErrorNoticeProps {
  error: SessionError
  onRetry(): void
  ref?: Ref<HTMLDivElement>
}

/** Error sentence. The announcer speaks it; this is where focus lands. */
export function ErrorNotice({ error, onRetry, ref }: ErrorNoticeProps) {
  return (
    <div
      ref={ref}
      tabIndex={-1}
      data-testid="session-error"
      className="flex flex-wrap items-center justify-between gap-3 rounded-hard border-2 border-border-strong bg-surface-2 p-4"
    >
      <p className="font-medium">{error.sentence}</p>
      {error.canRetry ? (
        <button type="button" onClick={onRetry} className={buttonClass('secondary')}>
          Try again
        </button>
      ) : null}
    </div>
  )
}
