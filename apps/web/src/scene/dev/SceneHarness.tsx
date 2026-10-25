import { useEffect } from 'react'
import { useLanding } from '@/state/landing'
import { useSession } from '@/state/session'
import { SCENE_SLOT_ID } from '../useSceneSlot'
import { requestViewReset } from '../viewControl'

/**
 * Dev-only page for looking at the scene before the web-shell's /sim has a #scene-slot.
 * Not routed in committed code; wire it with a temporary local route when needed.
 */
export function SceneHarness() {
  const phase = useSession((s) => s.phase)
  const domain = useSession((s) => s.domain)
  useEffect(() => {
    useLanding.getState().setSceneMode('sim')
    void useSession.getState().start({ mode: 'replay', fixture: 'worked_example' })
    return () => useLanding.getState().setSceneMode('hidden')
  }, [])
  return (
    <main id="main" className="px-4 py-4">
      <p className="font-mono text-sm" data-testid="harness-phase">
        {domain} / {phase}
      </p>
      <div className="my-3 flex gap-3">
        <button
          type="button"
          className="border border-border-strong px-3 py-2"
          onClick={() => void useSession.getState().replayNext()}
        >
          Next recorded reading
        </button>
        <button
          type="button"
          className="border border-border-strong px-3 py-2"
          onClick={() =>
            useSession.setState({ domain: domain === 'circuit' ? 'thermometer' : 'circuit' })
          }
        >
          Toggle instrument
        </button>
        <button
          type="button"
          className="border border-border-strong px-3 py-2"
          onClick={requestViewReset}
        >
          Reset view
        </button>
      </div>
      <div id={SCENE_SLOT_ID} className="relative h-[640px] w-full border border-hairline" />
    </main>
  )
}
