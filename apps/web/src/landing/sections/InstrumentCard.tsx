import { useMemo, type CSSProperties, type FocusEvent } from 'react'
import { formatPct } from '@/lib/format'
import { buttonClass } from '@/ui/button'
import s from '../landing.module.css'
import ic from '../instrument.module.css'
import { cx } from '../cx'
import { heroCaption, heroFrame, type HeroFrame } from '../heroFrame'
import {
  HERO_RECORDING_IDS,
  buttonLabel,
  isRunning,
  positionAt,
  useHeroDriver,
  useHeroLoop,
} from '../heroLoop'
import { Caption, WarningGlyph } from '../parts'
import { useFixtures } from '../useFixture'

interface InstrumentCardProps {
  reduced: boolean
}

/**
 * The live instrument (UI_CONTRACT 5.2): recorded engine runs on a loop with one Pause/Play button.
 * Hover or focus inside holds it. It never touches the session store, so it never speaks.
 */
export function InstrumentCard({ reduced }: InstrumentCardProps) {
  const load = useFixtures(HERO_RECORDING_IDS)
  const fixtures = load.status === 'ready' ? load.fixtures : null
  const counts = useMemo(() => fixtures?.map((f) => f.steps.length) ?? null, [fixtures])
  useHeroDriver(counts, reduced)
  const state = useHeroLoop((st) => st.state)
  const dispatch = useHeroLoop((st) => st.dispatch)
  const running = isRunning(state)

  const frame = useMemo(() => {
    if (!fixtures || !counts) return null
    const { recording, readings } = positionAt(counts, state.tick)
    const fx = fixtures[recording]!
    return heroFrame(fx, HERO_RECORDING_IDS[recording]!, readings)
  }, [fixtures, counts, state.tick])

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      dispatch({ type: 'focus', inside: false })
    }
  }

  return (
    <div
      role="group"
      aria-label="Live instrument"
      className={ic.instrument}
      data-running={running ? 'true' : 'false'}
      onPointerEnter={() => dispatch({ type: 'pointer', inside: true })}
      onPointerLeave={() => dispatch({ type: 'pointer', inside: false })}
      onFocus={() => dispatch({ type: 'focus', inside: true })}
      onBlur={onBlur}
    >
      <div className={ic.instHead}>
        <p className={ic.instTitle}>
          Live instrument, recorded simulated runs
          <br />
          <span className={ic.instRecording}>
            {frame
              ? `${frame.recordingName}, reading ${frame.readingsShown} of ${frame.stepCount}`
              : 'Loading'}
          </span>
        </p>
        <button
          type="button"
          className={buttonClass('secondary', ic.instButton)}
          aria-disabled={!fixtures || undefined}
          onClick={() => fixtures && dispatch({ type: 'toggle' })}
        >
          {buttonLabel(state)}
        </button>
      </div>
      {frame ? (
        <InstrumentView frame={frame} tick={state.tick} />
      ) : (
        <p className={cx(s.body, 'text-text-2')}>
          {load.status === 'missing' ? load.sentence : 'Loading the recorded runs.'}
        </p>
      )}
      <Caption>{frame ? heroCaption(frame) : 'Recording loading.'}</Caption>
    </div>
  )
}

/** One recorded moment. Presentational: every value arrives in `frame`. */
function InstrumentView({ frame, tick }: { frame: HeroFrame; tick: number }) {
  const probeAt = frame.landed ?? frame.told
  const stripStyle = { '--sites': frame.siteLabels.length, '--probe': probeAt } as CSSProperties
  return (
    <>
      <div className={ic.strip} style={stripStyle}>
        <span className={ic.probe} aria-hidden="true" />
        <ol className={ic.stripRows} aria-label="Breadboard rows in this recording">
          {frame.siteLabels.map((label, i) => {
            const isTold = i === frame.told
            const isLanded = i === frame.landed
            const tags = [isTold && 'told', isLanded && 'landed'].filter(Boolean)
            return (
              <li
                key={label}
                className={cx(
                  ic.stripRow,
                  isTold && ic.stripRowTold,
                  isLanded && ic.stripRowLanded,
                )}
              >
                <span>{label.replace(/^row /, '')}</span>
                {tags.map((tag) => (
                  <span key={String(tag)} className={ic.stripTag}>
                    {tag}
                  </span>
                ))}
              </li>
            )
          })}
        </ol>
        {/* The hand is simulated in every recording; the legend says so under every strip state. */}
        <p className={ic.stripLegend}>
          Told row outlined. Landed row filled: where the simulated hand touched.
        </p>
      </div>

      <div className={ic.instReadout}>
        <div>
          <p className={s.label}>Meter reading</p>
          {frame.readingDigits ? (
            <p className={ic.instReading}>
              <span className="sr-only">{frame.reading}</span>
              <span aria-hidden="true">
                {frame.readingDigits.split('').map((ch, i) => (
                  <span
                    key={`${tick}-${i}`}
                    className={ic.digit}
                    style={{ '--i': i } as CSSProperties}
                  >
                    {ch}
                  </span>
                ))}
                <span className={ic.instUnit}>{frame.unit}</span>
              </span>
            </p>
          ) : (
            <p className={cx(ic.instReading, ic.instReadingEmpty)}>No reading yet</p>
          )}
        </div>
        <p className={ic.instMeta}>
          {frame.entropyBits.toFixed(2)} of {frame.maxEntropyBits.toFixed(2)} bits
          <br />
          uncertainty
        </p>
      </div>

      <div className={ic.instSlot}>
        <Verdict key={tick} frame={frame} />
      </div>

      <Belief frame={frame} />
    </>
  )
}

function Verdict({ frame }: { frame: HeroFrame }) {
  if (frame.warning) {
    return (
      <p className={s.warning}>
        <WarningGlyph className={s.glyph} />
        <span className={s.warningWord}>Warning.</span> Your probe is not where you think it is.
        Most likely {frame.warning.likelyLabel}.
      </p>
    )
  }
  if (frame.unresolvedText) {
    return (
      <p className={s.refusalNote}>
        {frame.unresolvedText} Truehand asks for a different measurement instead of guessing.
      </p>
    )
  }
  if (frame.diagnosis && frame.isResolved) {
    return (
      <p className={s.verdict}>
        Resolved: <strong>{frame.diagnosis.label}</strong>,{' '}
        <span className={s.mono}>{formatPct(frame.diagnosis.p)}</span>.
      </p>
    )
  }
  if (frame.readingsShown === 0) {
    return <p className={s.verdict}>Told: {frame.instruction.split('. ')[0]}.</p>
  }
  return <p className={s.verdict}>Not sure yet, so it asks for another reading.</p>
}

function scale(p: number): CSSProperties {
  return { transform: `scaleX(${Math.max(0, Math.min(1, p))})` }
}

/** Top beliefs re-settle in place: bars keyed by rank, so widths travel when the ranking changes. */
function Belief({ frame }: { frame: HeroFrame }) {
  return (
    <div className="grid gap-4">
      <div className={s.beliefHead}>
        <p className={s.label}>Truehand belief, top {frame.truehand.length}</p>
        <p className={cx(s.mono, 'text-sm text-text-2')}>{frame.hypothesisCount} faults</p>
      </div>
      <ul className={s.bars}>
        {frame.truehand.map((h, i) => (
          <li key={i}>
            <div className={s.barLabel}>
              <span>{h.label}</span>
              <span className={s.mono}>{formatPct(h.p)}</span>
            </div>
            <div className={s.barTrack} aria-hidden="true">
              <div className={cx(s.barFill, s.barTruehand)} style={scale(h.p)} />
            </div>
          </li>
        ))}
        <li>
          <div className={s.barLabel}>
            <span>
              Published method{frame.published ? `: ${frame.published.label}` : ', waiting'}
            </span>
            <span className={s.mono}>{frame.published ? formatPct(frame.published.p) : ''}</span>
          </div>
          <div className={s.barTrack} aria-hidden="true">
            <div className={cx(s.barFill, s.barPublished)} style={scale(frame.published?.p ?? 0)} />
          </div>
        </li>
      </ul>
    </div>
  )
}
