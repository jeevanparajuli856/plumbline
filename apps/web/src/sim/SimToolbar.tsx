import { Link } from 'react-router'
import { useMotionPref } from '@/a11y/motionPref'
import type { ApiHealth, DomainId, Mode } from '@/state/types'
import { Badge } from '@/ui/Badge'
import { KEYCAP } from '@/ui/button'
import { RadioGroup, type RadioOption } from '@/ui/RadioGroup'
import { SmallScreenDisclosure } from '@/ui/SmallScreenDisclosure'
import { Switch } from '@/ui/Switch'
import { ApiStatus } from './ApiStatus'

const INSTRUMENTS: readonly RadioOption<DomainId>[] = [
  { value: 'circuit', label: 'Circuit' },
  { value: 'thermometer', label: 'Thermometer (simulated)' },
]

const MODES: readonly RadioOption<Mode>[] = [
  { value: 'simulate', label: 'Simulate' },
  { value: 'live', label: 'Live meter' },
  { value: 'replay', label: 'Replay' },
]

interface SimToolbarProps {
  domain: DomainId
  mode: Mode
  simulated: boolean
  speech: boolean
  health: ApiHealth
  onDomain(domain: DomainId): void
  onMode(mode: Mode): void
  onSpeech(on: boolean): void
  onShortcuts(): void
  onRetryHealth(): void
}

/**
 * Web app settings strip. Read left to right: what you measure, how, how it talks, motion, the
 * way to the display settings, engine status.
 */
export function SimToolbar(props: SimToolbarProps) {
  const { domain, mode, simulated, speech, health } = props
  return (
    <section aria-label="Web app settings" className="border-b border-hairline bg-surface-1">
      <div className="mx-auto grid max-w-[90rem] gap-y-3 px-4 py-3 sm:px-8 lg:px-16">
        <SmallScreenDisclosure
          label="Web app settings"
          className="flex-wrap items-center gap-x-6 gap-y-3"
        >
          <RadioGroup
            label="Instrument"
            value={domain}
            options={INSTRUMENTS}
            onChange={props.onDomain}
            commit="explicit"
          />
          <RadioGroup
            label="Mode"
            value={mode}
            options={MODES}
            onChange={props.onMode}
            commit="explicit"
          />
          <Switch
            label="Speech"
            checked={speech}
            onChange={props.onSpeech}
            keyshortcut="V"
            keyHint="V"
            description="Spoken output. Off by default; screen-reader text is always on."
          />
          <ReduceMotionSwitch />
          <button
            type="button"
            onClick={props.onShortcuts}
            aria-keyshortcuts="?"
            aria-haspopup="dialog"
            className="inline-flex min-h-11 items-center gap-2 rounded-hard px-2 font-medium hover:bg-surface-2"
          >
            Keyboard shortcuts{' '}
            <kbd aria-hidden="true" className={KEYCAP}>
              ?
            </kbd>
          </button>
          {/* Theme and Text only live on /accessibility (ADR-0014); one step away from here. */}
          <Link
            to="/accessibility"
            className="inline-flex min-h-11 items-center px-2 font-medium text-text underline decoration-hairline underline-offset-4 hover:decoration-text"
          >
            Display settings
          </Link>
        </SmallScreenDisclosure>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {simulated ? (
            <Badge
              kind="SIMULATED"
              title="The thermometer model is a textbook heat equation, not a real probe."
            />
          ) : null}
          <ApiStatus health={health} onRetry={props.onRetryHealth} />
        </div>
      </div>
    </section>
  )
}

function ReduceMotionSwitch() {
  const reduceMotion = useMotionPref((s) => s.reduceMotion)
  const setReduceMotion = useMotionPref((s) => s.setReduceMotion)
  return <Switch label="Reduce motion" checked={reduceMotion} onChange={setReduceMotion} />
}
