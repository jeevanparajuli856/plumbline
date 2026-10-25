import type { Ref } from 'react'
import { formatPct } from '@/lib/format'
import type { Warning } from '@/state/types'
import { capitalize } from './view'

interface WarningBannerProps {
  warning: Warning
  likelyLabel: string
  ref?: Ref<HTMLDivElement>
}

const LEAD = 'Warning.'

/** Placement warning: vermilion left rule, glyph, the word, then the likely row. Reserved for this one event. */
export function WarningBanner({ warning, likelyLabel, ref }: WarningBannerProps) {
  const rest = warning.text.startsWith(LEAD) ? warning.text.slice(LEAD.length).trim() : warning.text
  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      data-testid="warning-banner"
      className="relative overflow-hidden rounded-hard border-2 border-warning bg-warning-surface py-5 pl-8 pr-5 text-warning-text"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-2 origin-top bg-warning animate-[warning-strike_var(--motion-warning-strike)_var(--ease-smooth)_both]"
      />
      <p className="flex items-start gap-3 text-lg font-medium leading-snug">
        <WarningGlyph />
        <span>
          <strong className="font-semibold">{LEAD}</strong> {rest}
        </span>
      </p>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-3 pl-9">
        <span className="label-caps text-warning-text">Likely</span>
        <span className="font-mono tnum text-lg font-semibold">
          {capitalize(likelyLabel)} {formatPct(warning.pOffSite, 0)}
        </span>
      </p>
    </div>
  )
}

function WarningGlyph() {
  return (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" className="mt-0.5 shrink-0">
      <path
        d="M12 2 L23 21 H1 Z"
        fill="var(--warning)"
        stroke="var(--warning)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="11" y="8" width="2" height="7" fill="var(--on-warning)" />
      <rect x="11" y="17" width="2" height="2" fill="var(--on-warning)" />
    </svg>
  )
}
