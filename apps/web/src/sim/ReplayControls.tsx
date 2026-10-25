import type { ReplayState } from '@/state/types'
import { Badge } from '@/ui/Badge'
import { buttonClass, KEYCAP } from '@/ui/button'

interface ReplayControlsProps {
  replay: ReplayState | null
  canStep: boolean
  onPrevious(): void
  onNext(): void
  onPlayPause(): void
  onReset(): void
}

/** Recording transport plus Reset. Every button carries its key in aria-keyshortcuts. */
export function ReplayControls({
  replay,
  canStep,
  onPrevious,
  onNext,
  onPlayPause,
  onReset,
}: ReplayControlsProps) {
  const finished = replay ? replay.stepIndex >= replay.totalSteps : true
  return (
    <div className="grid gap-3">
      {replay ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="label-caps">Recording</span>
          <span className="font-mono tnum">
            Step {Math.min(replay.stepIndex, replay.totalSteps)} of {replay.totalSteps}
          </span>
          {replay.provisional ? (
            <Badge
              kind="PROVISIONAL"
              title="Hand-typed recording; replaced by the engine's recorded fixture before release."
            />
          ) : null}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {replay ? (
          <div
            role="group"
            aria-label="Recording controls"
            className="flex flex-wrap items-center gap-2"
          >
            <button
              type="button"
              onClick={onPrevious}
              disabled={replay.stepIndex === 0}
              aria-keyshortcuts="["
              className={buttonClass('secondary')}
            >
              Previous step{' '}
              <kbd aria-hidden="true" className={KEYCAP}>
                [
              </kbd>
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!canStep || finished}
              aria-keyshortcuts="]"
              className={buttonClass('primary')}
            >
              Next recorded reading{' '}
              <kbd aria-hidden="true" className="font-mono text-sm opacity-80">
                ]
              </kbd>
            </button>
            <button
              type="button"
              onClick={onPlayPause}
              disabled={finished && !replay.autoplay}
              aria-keyshortcuts="P"
              className={buttonClass('secondary')}
            >
              {replay.autoplay ? 'Pause' : 'Play'}{' '}
              <kbd aria-hidden="true" className={KEYCAP}>
                P
              </kbd>
            </button>
          </div>
        ) : null}
        <button type="button" onClick={onReset} className={buttonClass('quiet', 'ml-auto')}>
          Reset
        </button>
      </div>
    </div>
  )
}
