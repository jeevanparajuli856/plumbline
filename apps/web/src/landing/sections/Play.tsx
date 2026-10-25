import type { FixtureT } from '@/engine/schemas'
import { formatPct } from '@/lib/format'
import { useLanding } from '@/state/landing'
import { useSession } from '@/state/session'
import { stickyStateAt } from '../choreography'
import s from '../landing.module.css'
import rc from '../race.module.css'
import { Badge } from '@/ui/Badge'
import { SceneRender } from '../art/SceneRender'
import { Caption, Eyebrow, Section } from '../parts'
import { countWord } from '../numberWords'
import { cx } from '../cx'
import {
  comparisonRows,
  frameAt,
  isProvisional,
  labelOf,
  raceStages,
  rank,
  transcript,
  type PlayFrame,
} from '../workedExample'
import { ProvenanceLine } from '../ProvenanceLine'
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
    <Section id="play" motion="bars" sceneKey="play" className={s.feature}>
      {/* No CSS sticky track: the motion module pins this block and its spacer gives the scroll length. */}
      <div className={s.playStage}>
        <div className="w-full">
          <div className={cx(s.frame, s.grid, 'w-full gap-y-10 py-20 md:py-16')}>
            <div className="col-span-4 md:col-span-12 lg:col-span-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Eyebrow>The technology</Eyebrow>
                {fixture && isProvisional(fixture) && <Badge kind="PROVISIONAL" />}
              </div>
              <h2 id="play-title" className={cx(s.h2, 'mt-5')}>
                The reading is right. The row is wrong.
              </h2>
              <p className={cx(s.lead, 'mt-5')}>
                {fixture ? `${slipSentence(fixture)} ` : ''}Truehand keeps the doubt until the next
                reading settles it.
              </p>
              {fixture && <Race fixture={fixture} />}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <ControlButton
                  id={PLAY_BUTTON_ID}
                  primary
                  isUnavailable={!fixture || (isSession && autoplay)}
                  onPress={onPlay}
                >
                  Play the worked example
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
              <p className="mt-3 text-base text-on-feature-muted">{status}</p>
            </div>
            <div className="col-span-4 md:col-span-12 lg:col-span-7">
              {fixture && view ? (
                <PlayPanel
                  frame={view.frame}
                  siteLabels={fixture.catalog.site_labels}
                  trueHypothesis={fixture.true_hypothesis}
                  isTravelling={view.isTravelling}
                />
              ) : (
                <p className={s.body}>Loading the recorded run.</p>
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

/**
 * The two-method race (UI_CONTRACT 5.3). Static DOM is the final state; each bar carries its
 * top-fault probability before any reading and after each reading, read from the recording.
 */
function Race({ fixture }: { fixture: FixtureT }) {
  const stages = raceStages(fixture)
  const last = fixture.steps.at(-1)
  const rows = [
    {
      key: 'published',
      name: 'Conventional assistant',
      stages: stages.published,
      top: last ? labelOf(fixture, last.baseline.top) : '',
      isTrue: last?.baseline.top === fixture.true_hypothesis,
      fill: rc.racePublished,
    },
    {
      key: 'ours',
      name: 'Truehand',
      stages: stages.ours,
      top: last ? (rank(fixture, last.belief, 1)[0]?.label ?? '') : '',
      isTrue: last ? rank(fixture, last.belief, 1)[0]?.id === fixture.true_hypothesis : false,
      fill: rc.raceOurs,
    },
  ]
  return (
    <div className={cx(rc.race, 'mt-8')}>
      <p className={s.label}>After {countWord(fixture.steps.length)} readings, top fault</p>
      {rows.map((r) => {
        const final = r.stages.at(-1) ?? 0
        return (
          <div key={r.key}>
            <div className={rc.raceLabel}>
              <span>
                <strong>{r.name}</strong>: {r.top}
              </span>
              {/* One label per stage, stacked; the static page shows the last, the scrub swaps them. */}
              <span className={cx(s.mono, rc.stageLabels)}>
                {r.stages.map((p, i) => (
                  <span
                    key={i}
                    data-motion-stage-label={String(i)}
                    className={i === r.stages.length - 1 ? undefined : rc.stageHidden}
                  >
                    {formatPct(p)}
                  </span>
                ))}
              </span>
            </div>
            <div className={rc.raceTrack} aria-hidden="true">
              <div
                className={cx(rc.raceFill, r.fill)}
                data-motion-bar={r.key}
                data-motion-stages={r.stages.map((p) => p.toFixed(4)).join(',')}
                style={{ transform: `scaleX(${Math.max(0, Math.min(1, final))})` }}
              />
            </div>
            <p className={cx(rc.raceVerdict, 'mt-1')}>{r.isTrue ? 'true fault' : 'wrong fault'}</p>
          </div>
        )
      })}
    </div>
  )
}

/** "Told row 3, the hand lands on row 2." from the first recorded step. */
function slipSentence(fx: FixtureT): string {
  const first = fx.steps[0]
  if (!first || first.landed_site === null) return ''
  const told = fx.catalog.site_labels[first.told_site]
  const landed = fx.catalog.site_labels[first.landed_site]
  return `Told ${told}, the hand lands on ${landed}.`
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
      className={primary ? s.featurePrimary : s.featureButton}
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
    <div className={cx(s.frame, s.grid, 'gap-y-12 pb-32 pt-8')}>
      <div className="col-span-4 md:col-span-5">
        <h3 className={s.h3}>Step by step</h3>
        <ol aria-label="Worked example, step by step" className={cx(s.steps, 'mt-6')}>
          {items.map((item) => (
            <li key={item.key} className={cx(s.step, item.kind === 'warning' && s.stepWarning)}>
              <span>{item.text}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="col-span-4 md:col-span-7">
        <h3 className={s.h3}>Same readings, two methods</h3>
        <div className={cx(s.tableScroll, 'mt-6')}>
          <table className={s.table}>
            <caption className="sr-only">
              Truehand and a conventional assistant on the same readings
            </caption>
            <thead>
              <tr>
                <th scope="col">Reading</th>
                <th scope="col">Truehand</th>
                <th scope="col">Conventional assistant</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.step}>
                  <th scope="row" className="font-normal">
                    <span className={cx(s.mono, 'block')}>{r.reading}</span>
                    <span className="block text-base text-on-feature-muted">
                      told {r.told}, landed {r.landed}
                    </span>
                  </th>
                  <td className={r.truehand.isTrue ? 'font-bold' : undefined}>
                    {r.truehand.label}, <span className={s.mono}>{formatPct(r.truehand.p)}</span>
                    {r.truehand.isTrue && <span className="block text-base">true fault</span>}
                  </td>
                  <td className={r.published.isTrue ? 'font-bold' : undefined}>
                    {r.published.label}, <span className={s.mono}>{formatPct(r.published.p)}</span>
                    {!r.published.isTrue && <span className="block text-base">wrong</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={cx(s.body, 'mt-6 text-on-feature-muted')}>
          True fault in this recording: {labelOf(fixture, fixture.true_hypothesis)}.
        </p>
        <ProvenanceLine fixture={fixture} className="mt-4" />
        {isProvisional(fixture) && (
          <p className={cx(s.body, 'mt-4')}>
            <Badge kind="PROVISIONAL" /> These numbers come from a hand-typed reconstruction. They
            are replaced when the engine records this run.
          </p>
        )}
        <SceneRender sizes="(min-width: 768px) 50vw, 100vw" className="mt-12" />
      </div>
    </div>
  )
}
