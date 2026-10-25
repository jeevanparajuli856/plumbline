import type { CSSProperties } from 'react'
import { formatPct } from '@/lib/format'
import s from '../landing.module.css'
import { cx } from '../cx'
import type { PlayFrame, RankedHypothesis } from '../workedExample'

/** Entropy ratios below these read as low / medium uncertainty in words. */
const LOW_UNCERTAINTY = 0.1
const MEDIUM_UNCERTAINTY = 0.5

interface PlayPanelProps {
  frame: PlayFrame
  siteLabels: readonly string[]
  trueHypothesis: string
  isTravelling: boolean
}

function uncertaintyWord(ratio: number): string {
  if (ratio < LOW_UNCERTAINTY) return 'low'
  if (ratio < MEDIUM_UNCERTAINTY) return 'medium'
  return 'high'
}

function scale(p: number): CSSProperties {
  return { transform: `scaleX(${Math.max(0, Math.min(1, p))})` }
}

/** What the worked example looks like at one moment. Presentational: every value arrives in `frame`. */
export function PlayPanel({ frame, siteLabels, trueHypothesis, isTravelling }: PlayPanelProps) {
  const ratio = frame.maxEntropyBits > 0 ? frame.entropyBits / frame.maxEntropyBits : 0
  return (
    <div className={cx(s.panel, 'grid gap-6')}>
      <ol className={s.rows} aria-label="Breadboard rows in the worked example">
        {siteLabels.map((label, i) => {
          const isTold = i === frame.told
          const isLanded = i === frame.landed
          const tags = [isTold && 'told', isLanded && 'landed'].filter(Boolean).join(', ')
          return (
            <li key={label} className={cx(s.row, isTold && s.rowTold, isLanded && s.rowLanded)}>
              <span>{label}</span>
              {tags && <span className={s.rowTag}>{tags}</span>}
            </li>
          )
        })}
      </ol>

      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="text-base text-text-2">Meter reading</p>
          <p className={cx(s.reading, !frame.reading && s.readingEmpty)}>
            {frame.reading ?? (isTravelling ? 'Probe travelling' : 'No reading yet')}
          </p>
        </div>
        <p className="max-w-[22em] text-base text-text-2">
          {frame.landedLabel
            ? `Told ${frame.toldLabel}. Landed on ${frame.landedLabel}.`
            : `Told ${frame.toldLabel}. The landed row stays hidden until the reading is accepted.`}
        </p>
      </div>

      {frame.warning && (
        <p key={frame.readingsShown} className={s.warning}>
          <span aria-hidden="true">&#x26A0;&#xFE0E; </span>
          <span className={s.warningWord}>Warning.</span> Your probe is not where you think it is.
          Most likely {frame.warning.likelyLabel}.
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {frame.readingsShown === 0 ? (
          <div>
            <h3 className="text-lg font-semibold">Plumbline</h3>
            <p className="mt-2 text-base text-text-2">
              {frame.hypothesisCount} faults, all equally likely:{' '}
              <span className={s.mono}>{formatPct(1 / Math.max(1, frame.hypothesisCount))}</span>{' '}
              each.
            </p>
          </div>
        ) : (
          <BarList
            title="Plumbline"
            items={frame.plumbline}
            tone="plumbline"
            trueHypothesis={frame.isResolved ? trueHypothesis : null}
          />
        )}
        <BarList
          title="Published method"
          items={frame.published ? [frame.published] : []}
          tone="published"
          trueHypothesis={frame.isResolved ? trueHypothesis : null}
          empty="Waits for the first reading."
        />
      </div>

      <div>
        <div className="flex justify-between gap-4 text-base">
          <span>Uncertainty: {uncertaintyWord(ratio)}</span>
          <span className={s.mono}>
            {frame.entropyBits.toFixed(2)} of {frame.maxEntropyBits.toFixed(2)} bits
          </span>
        </div>
        <div className={cx(s.entropy, 'mt-2')} aria-hidden="true">
          <div className={s.entropyFill} style={scale(ratio)} />
        </div>
      </div>
    </div>
  )
}

interface BarListProps {
  title: string
  items: readonly RankedHypothesis[]
  tone: 'plumbline' | 'published'
  trueHypothesis: string | null
  empty?: string
}

function BarList({ title, items, tone, trueHypothesis, empty }: BarListProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-base text-text-2">{empty}</p>
      ) : (
        <ul className={cx(s.bars, 'mt-2')}>
          {items.map((h, i) => {
            const verdict =
              trueHypothesis === null || i > 0
                ? ''
                : h.id === trueHypothesis
                  ? ' (true fault)'
                  : ' (wrong)'
            return (
              <li key={h.id}>
                <div className={cx(s.barLabel, trueHypothesis === h.id && s.barTrue)}>
                  <span>
                    {h.label}
                    {verdict}
                  </span>
                  <span className={s.mono}>{formatPct(h.p)}</span>
                </div>
                <div className={s.barTrack} aria-hidden="true">
                  <div
                    className={cx(
                      s.barFill,
                      tone === 'plumbline' ? s.barPlumbline : s.barPublished,
                    )}
                    style={scale(h.p)}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
