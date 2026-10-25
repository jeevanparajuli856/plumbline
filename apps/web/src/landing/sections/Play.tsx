import type { FixtureT } from '@/engine/schemas'
import { formatPct } from '@/lib/format'
import { useLanding } from '@/state/landing'
import { useSession } from '@/state/session'
import { stickyStateAt } from '../choreography'
import s from '../landing.module.css'
import { Badge, Caption, Eyebrow, Section } from '../parts'
import { cx } from '../cx'
import {
  comparisonRows,
  frameAt,
  isProvisional,
  labelOf,
  transcript,
  type PlayFrame,
} from '../workedExample'
import { PlayPanel } from './PlayPanel'

export const PLAY_BUTTON_ID = 'play-start'
export const PAUSE_BUTTON_ID = 'play-pause'

interface PlayProps {
  fixture: FixtureT | null
  onPlay(): void
  onReplay(): void
}

/** Which recorded moment the scrubbed scene is resting on, as readings shown. */
function scrubFrame(
  fx: FixtureT,
  state: string | undefined,
): { frame: PlayFrame; isTravelling: boolean } {
  if (state === 'landed') return { frame: frameAt(fx, 1), isTravelling: false }
  if (state === 'resolved') return { frame: frameAt(fx, fx.steps.length), isTravelling: false }
  return { frame: frameAt(fx, 0), isTravelling: state === 'travelling' }
}

function usePlayState(fx: FixtureT | null) {
  const scrubState = useLanding((st) => {
    const sticky = stickyStateAt(st.progress)
    return sticky?.section === 'play' ? sticky.state : undefined
  })
  const fixtureId = useSession((st) => st.replay?.fixtureId ?? null)
  const autoplay = useSession((st) => st.replay?.autoplay ?? false)
  const readingCount = useSession((st) => st.readings.length)
  const phase = useSession((st) => st.phase)
  const isSession = fx !== null && fixtureId === fx.name && phase !== 'idle'
  const isFinished = phase === 'resolved' || phase === 'unresolved'
  return { scrubState, isSession, autoplay, readingCount, phase, isFinished }
}

export function Play({ fixture, onPlay, onReplay }: PlayProps) {
  const { scrubState, isSession, autoplay, readingCount, phase, isFinished } = usePlayState(fixture)
  const replayPause = useSession((st) => st.replayPause)

  const view = fixture
    ? isSession
      ? {
          frame: frameAt(fixture, readingCount, phase !== 'revealing'),
          isTravelling: phase === 'submitting',
        }
      : scrubFrame(fixture, scrubState)
    : null
  const status = !isSession
    ? 'Scroll to step through the recording, or press Play.'
    : isFinished
      ? 'Finished. Press Replay to watch again.'
      : autoplay
        ? `Playing the recorded run: reading ${readingCount} of ${fixture?.steps.length ?? 0}.`
        : `Paused after reading ${readingCount} of ${fixture?.steps.length ?? 0}.`

  return (
    <Section id="play">
      <div data-sticky-track className={cx(s.track, s.trackPlay)}>
        <div data-sticky-pin className={s.pin}>
          <div className={cx(s.frame, s.grid, 'w-full py-16 md:py-0')}>
            <div className={cx('col-span-4 md:col-span-6 md:col-start-7', s.phonePaper)}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Eyebrow>The technology</Eyebrow>
                {fixture && isProvisional(fixture) && <Badge kind="PROVISIONAL" />}
              </div>
              <h2 id="play-title" className={cx(s.h2, 'mt-4')}>
                The reading is right. The row is wrong.
              </h2>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <ControlButton
                  id={PLAY_BUTTON_ID}
                  primary
                  isUnavailable={!fixture || (isSession && autoplay)}
                  onPress={onPlay}
                >
                  Play the 20-second example
                </ControlButton>
                <ControlButton
                  id={PAUSE_BUTTON_ID}
                  isUnavailable={!isSession || !autoplay}
                  onPress={replayPause}
                >
                  Pause
                </ControlButton>
                <ControlButton isUnavailable={!isSession} onPress={onReplay}>
                  Replay
                </ControlButton>
              </div>
              <p className="mt-3 text-base text-text-2">{status}</p>
              {fixture && view ? (
                <div className="mt-6">
                  <PlayPanel
                    frame={view.frame}
                    siteLabels={fixture.catalog.site_labels}
                    trueHypothesis={fixture.true_hypothesis}
                    isTravelling={view.isTravelling}
                  />
                </div>
              ) : (
                <p className={cx(s.body, 'mt-6')}>Loading the recorded run.</p>
              )}
              <Caption className="mt-6">
                {fixture ? playCaption(fixture) : 'Scene: the recorded worked example.'}
              </Caption>
            </div>
          </div>
        </div>
      </div>
      {fixture && <PlayRecord fixture={fixture} />}
    </Section>
  )
}

function playCaption(fx: FixtureT): string {
  const first = fx.steps[0]
  if (!first) return 'Scene: the recorded worked example.'
  const told = fx.catalog.site_labels[first.told_site]
  const landed =
    first.landed_site === null ? 'an unknown row' : fx.catalog.site_labels[first.landed_site]
  return `Scene: told ${told}, the hand lands on ${landed}. The told row is outlined, the landed row fills amber once the reading is accepted.`
}

interface ControlButtonProps {
  id?: string
  primary?: boolean
  isUnavailable: boolean
  onPress(): void
  children: string
}

/** aria-disabled rather than disabled, so keyboard focus never falls off a control that just became unavailable. */
function ControlButton({ id, primary, isUnavailable, onPress, children }: ControlButtonProps) {
  return (
    <button
      id={id}
      type="button"
      aria-disabled={isUnavailable || undefined}
      onClick={() => !isUnavailable && onPress()}
      className={cx(s.button, primary && s.primary)}
    >
      {children}
    </button>
  )
}

/** The always-present record: the step list and the side-by-side table, both read from the fixture. */
function PlayRecord({ fixture }: { fixture: FixtureT }) {
  const items = transcript(fixture)
  const rows = comparisonRows(fixture)
  return (
    <div className={cx(s.section, s.sheet)}>
      <div className={cx(s.frame, s.grid, 'gap-y-12')}>
        <div className="col-span-4 md:col-span-6">
          <h3 className={s.h3}>Step by step</h3>
          <ol aria-label="Worked example, step by step" className={cx(s.steps, 'mt-6')}>
            {items.map((item) => (
              <li key={item.key} className={cx(s.step, item.kind === 'warning' && s.stepWarning)}>
                <span>{item.text}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="col-span-4 md:col-span-6">
          <h3 className={s.h3}>Same readings, two methods</h3>
          <div className={cx(s.tableScroll, 'mt-6')}>
            <table className={s.table}>
              <caption className="sr-only">
                Plumbline and the published method on the same readings
              </caption>
              <thead>
                <tr>
                  <th scope="col">Reading</th>
                  <th scope="col">Plumbline</th>
                  <th scope="col">Published method</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.step}>
                    <th scope="row" className="font-normal">
                      <span className={cx(s.mono, 'block')}>{r.reading}</span>
                      <span className="block text-base text-text-2">
                        told {r.told}, landed {r.landed}
                      </span>
                    </th>
                    <td className={r.plumbline.isTrue ? 'font-semibold' : undefined}>
                      {r.plumbline.label},{' '}
                      <span className={s.mono}>{formatPct(r.plumbline.p)}</span>
                      {r.plumbline.isTrue && <span className="block text-base">true fault</span>}
                    </td>
                    <td className={r.published.isTrue ? 'font-semibold' : undefined}>
                      {r.published.label},{' '}
                      <span className={s.mono}>{formatPct(r.published.p)}</span>
                      {!r.published.isTrue && <span className="block text-base">wrong</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={cx(s.body, 'mt-6 text-text-2')}>
            Published method: entropy-based test selection that assumes the probe is where you were
            told (Gao et al., 2014). It is our implementation, run in shadow on the identical
            readings. True fault in this recording: {labelOf(fixture, fixture.true_hypothesis)}.
          </p>
          {isProvisional(fixture) && (
            <p className={cx(s.body, 'mt-4')}>
              <Badge kind="PROVISIONAL" /> These numbers come from a hand-typed reconstruction. They
              are replaced when the engine records this run.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
