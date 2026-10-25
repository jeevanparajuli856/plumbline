import { useCallback, useEffect } from 'react'
import { useSession } from '@/state/session'
import { useFixture, type FixtureLoad } from './useFixture'

export const WORKED_EXAMPLE_ID = 'worked_example'
/** Time between recorded readings on Play: long enough to read the warning before the next one. */
export const PLAY_PACE_MS = 4000

async function startReplay(): Promise<void> {
  await useSession.getState().start({ mode: 'replay', fixture: WORKED_EXAMPLE_ID, silent: false })
}

function isReplayOfExample(): boolean {
  const st = useSession.getState()
  return st.replay?.fixtureId === WORKED_EXAMPLE_ID && st.phase !== 'idle'
}

export interface WorkedReplay {
  load: FixtureLoad
  play(): Promise<void>
  replay(): Promise<void>
  /** One recorded reading at a time (the phone preview); restarts after the end. */
  step(): Promise<void>
}

/**
 * The worked example on the global session store, for the pages that let a reader drive it
 * (How it works Play, The app phone). Never autoplays; pauses when the page unmounts.
 */
export function useWorkedReplay(): WorkedReplay {
  const load = useFixture(WORKED_EXAMPLE_ID)

  useEffect(
    () => () => {
      // A replay started here must not keep stepping once the reader leaves the page.
      useSession.getState().replayPause()
    },
    [],
  )

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

  const step = useCallback(async () => {
    const st = useSession.getState()
    st.replayPause()
    const isOver = st.phase === 'resolved' || st.phase === 'unresolved' || st.phase === 'error'
    if (!isReplayOfExample() || isOver) {
      const wasResolved = st.phase === 'resolved'
      await startReplay()
      if (wasResolved) return
    }
    await useSession.getState().replayNext()
  }, [])

  return { load, play, replay, step }
}
