import { useCallback, useEffect, useRef } from 'react'
import { useReducedMotion } from '@/a11y/useReducedMotion'
import { webglSupported } from '@/lib/webgl'
import { useLanding } from '@/state/landing'
import { usePrefs } from '@/state/prefs'
import { useSession } from '@/state/session'
import s from './landing.module.css'
import { cx } from './cx'
import { Close } from './sections/Close'
import { Evidence } from './sections/Evidence'
import { Generalize } from './sections/Generalize'
import { How } from './sections/How'
import { Ladder } from './sections/Ladder'
import { Mast } from './sections/Mast'
import { PAUSE_BUTTON_ID, Play } from './sections/Play'
import { Problem } from './sections/Problem'
import { Product } from './sections/Product'
import { Research } from './sections/Research'
import { useFixture } from './useFixture'
import { useScrollProgress } from './useScrollProgress'

const FIXTURE_ID = 'worked_example'
/** Time between recorded readings on Play: long enough to read the warning before the next one. */
export const PLAY_PACE_MS = 4000

async function startReplay(): Promise<void> {
  await useSession.getState().start({ mode: 'replay', fixture: FIXTURE_ID, silent: false })
}

function isReplayOfExample(): boolean {
  const st = useSession.getState()
  return st.replay?.fixtureId === FIXTURE_ID && st.phase !== 'idle'
}

/** Container: owns scroll progress, the scene mode and the replay actions. Sections are presentational. */
export function LandingPage() {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const setSceneMode = useLanding((st) => st.setSceneMode)
  const textOnly = usePrefs((st) => st.textOnly)
  const load = useFixture(FIXTURE_ID)
  const fixture = load.status === 'ready' ? load.fixture : null
  const hasScene = !textOnly && webglSupported()

  useEffect(() => {
    setSceneMode('landing')
    return () => setSceneMode('hidden')
  }, [setSceneMode])
  useScrollProgress(rootRef, reduced)

  const play = useCallback(async () => {
    const st = useSession.getState()
    const canResume = isReplayOfExample() && st.phase === 'awaiting_reading'
    if (!canResume) await startReplay()
    useSession.getState().replayPlay(PLAY_PACE_MS)
  }, [])

  const replay = useCallback(async () => {
    useSession.getState().replayPause()
    await startReplay()
    useSession.getState().replayPlay(PLAY_PACE_MS)
  }, [])

  const playFromMast = useCallback(async () => {
    document.getElementById('play')?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' })
    await play()
    document.getElementById(PAUSE_BUTTON_ID)?.focus({ preventScroll: true })
  }, [play, reduced])

  const stepPhone = useCallback(async () => {
    const st = useSession.getState()
    st.replayPause()
    if (
      !isReplayOfExample() ||
      st.phase === 'resolved' ||
      st.phase === 'unresolved' ||
      st.phase === 'error'
    ) {
      const wasResolved = st.phase === 'resolved'
      await startReplay()
      if (wasResolved) return
    }
    await useSession.getState().replayNext()
  }, [])

  return (
    <main id="main" ref={rootRef} className={s.root} data-reduced={reduced ? 'true' : 'false'}>
      <Mast fixture={fixture} hasScene={hasScene} onPlay={() => void playFromMast()} />
      <Research />
      <Problem fixture={fixture} />
      <Play fixture={fixture} onPlay={() => void play()} onReplay={() => void replay()} />
      <How fixture={fixture} reduced={reduced} />
      <Generalize />
      <Product fixture={fixture} onStep={() => void stepPhone()} />
      <Ladder />
      <Evidence fixture={fixture} />
      <Close />
      {load.status === 'missing' && (
        <p role="status" className={cx(s.frame, s.body, 'pb-16')}>
          {load.sentence}
        </p>
      )}
    </main>
  )
}
