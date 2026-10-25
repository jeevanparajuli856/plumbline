import { useReducedMotion } from '@/a11y/useReducedMotion'
import s from './landing.module.css'
import { useMotionPref } from './motionPref'

/** role=switch, named "Reduce motion". When the OS already reduces motion the switch shows on and says why. */
export function ReduceMotionSwitch() {
  const os = useReducedMotion()
  const user = useMotionPref((st) => st.userReduced)
  const setUserReduced = useMotionPref((st) => st.setUserReduced)
  const checked = os || user
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={os ? 'reduce-motion-os' : undefined}
        aria-disabled={os || undefined}
        onClick={() => !os && setUserReduced(!user)}
        className={s.switch}
      >
        <span className={s.switchTrack} aria-hidden="true">
          <span className={s.switchThumb} />
        </span>
        <span>Reduce motion</span>
      </button>
      {os && (
        <span id="reduce-motion-os" className="text-muted">
          Set by your system
        </span>
      )}
    </span>
  )
}
