import { useMemo, type FocusEvent } from 'react'
import { buttonClass } from '@/ui/button'
import s from '../landing.module.css'
import { heroCaption, heroFrame } from '../heroFrame'
import {
  HERO_RECORDING_IDS,
  buttonLabel,
  isRunning,
  positionAt,
  useHeroDriver,
  useHeroLoop,
} from '../heroLoop'
import { Caption } from '../parts'
import { viewFromFrame } from '../phone/appScreen'
import { IPhone } from '../phone/IPhone'
import { useFixtures } from '../useFixture'
import { cx } from '../cx'

interface LiveInstrumentProps {
  reduced: boolean
}

/**
 * The live hero (UI_CONTRACT 5.2): the Truehand app on an iPhone, playing recorded engine runs on a
 * loop with one Pause/Play button. Hover or focus inside holds it. It never touches the session
 * store, so it never speaks or fights a replay the reader starts elsewhere. Two still phones
 * behind it show the worked example's warning and its answer; they are pictures (aria-hidden).
 */
export function LiveInstrument({ reduced }: LiveInstrumentProps) {
  const load = useFixtures(HERO_RECORDING_IDS)
  const fixtures = load.status === 'ready' ? load.fixtures : null
  const counts = useMemo(() => fixtures?.map((f) => f.steps.length) ?? null, [fixtures])
  useHeroDriver(counts, reduced)
  const state = useHeroLoop((st) => st.state)
  const dispatch = useHeroLoop((st) => st.dispatch)

  const frame = useMemo(() => {
    if (!fixtures || !counts) return null
    const { recording, readings } = positionAt(counts, state.tick)
    return heroFrame(fixtures[recording]!, HERO_RECORDING_IDS[recording]!, readings)
  }, [fixtures, counts, state.tick])

  const backdrop = useMemo(() => {
    const worked = fixtures?.[0]
    if (!worked || worked.steps.length === 0) return null
    const id = HERO_RECORDING_IDS[0]!
    return {
      warning: viewFromFrame(heroFrame(worked, id, 1)),
      answer: viewFromFrame(heroFrame(worked, id, worked.steps.length)),
    }
  }, [fixtures])

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      dispatch({ type: 'focus', inside: false })
    }
  }

  return (
    <div
      role="group"
      aria-label="Live instrument"
      className={s.liveInstrument}
      data-running={isRunning(state) ? 'true' : 'false'}
      onPointerEnter={() => dispatch({ type: 'pointer', inside: true })}
      onPointerLeave={() => dispatch({ type: 'pointer', inside: false })}
      onFocus={() => dispatch({ type: 'focus', inside: true })}
      onBlur={onBlur}
    >
      <div className={s.phoneStage}>
        {backdrop ? (
          <>
            <div className={cx(s.sidePhone, s.sideLeft)} aria-hidden="true" inert>
              <IPhone still view={backdrop.warning} frameKey="warning" />
            </div>
            <div className={cx(s.sidePhone, s.sideRight)} aria-hidden="true" inert>
              <IPhone still view={backdrop.answer} frameKey="answer" />
            </div>
          </>
        ) : null}
        <div className={s.centerPhone}>
          {frame ? (
            <IPhone view={viewFromFrame(frame)} frameKey={String(state.tick)} />
          ) : (
            <p className={s.liveLoading}>
              {load.status === 'missing' ? load.sentence : 'Loading the recorded runs.'}
            </p>
          )}
        </div>
      </div>
      <div className={s.liveControls}>
        <Caption className="sr-only">{frame ? heroCaption(frame) : 'Recording loading.'}</Caption>
        <button
          type="button"
          className={buttonClass('secondary', 'rounded-full px-5')}
          aria-disabled={!fixtures || undefined}
          onClick={() => fixtures && dispatch({ type: 'toggle' })}
        >
          {buttonLabel(state)}
        </button>
      </div>
    </div>
  )
}
