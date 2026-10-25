import { useMemo, useState } from 'react'
import type { FixtureT } from '@/engine/schemas'
import { formatPct } from '@/lib/format'
import { DOMAINS } from '@/state/domains'
import { useSession } from '@/state/session'
import { buttonClass } from '@/ui/button'
import s from '../landing.module.css'
import pr from '../product.module.css'
import { Caption, WarningGlyph } from '../parts'
import { cx } from '../cx'
import { heroFrame } from '../heroFrame'
import {
  HERO_RECORDING_IDS,
  PHONE_LAG_STEPS,
  phonePositionAt,
  useHeroDriver,
  useHeroLoop,
} from '../heroLoop'
import { useReducedMotion } from '@/a11y/useReducedMotion'
import { countWord } from '../numberWords'
import { useFixtures } from '../useFixture'
import { siteLabel } from '../workedExample'

/** What the phone screen shows, whoever drives it. */
interface PhoneView {
  status: string
  headline: string
  confidence: number | null
  lastReading: string | null
  warning: string | null
  refusal: string | null
}

function PhoneScreen({ view }: { view: PhoneView }) {
  return (
    <div className={pr.phone} role="group" aria-label="Phone preview of the text channel">
      <div className={pr.phoneBar}>
        <span>Truehand</span>
        <span>{view.status}</span>
      </div>
      <p className={pr.phoneInstruction}>{view.headline}</p>
      {view.confidence !== null && (
        <p className="text-lg">
          Confidence <span className={s.mono}>{formatPct(view.confidence)}</span>
        </p>
      )}
      {view.lastReading && (
        <p className="text-lg">
          Last reading{' '}
          <span className={cx(s.mono, 'font-semibold text-measured')}>{view.lastReading}</span>
        </p>
      )}
      {view.warning && (
        <p className={s.warning}>
          <WarningGlyph className={s.glyph} />
          <span className={s.warningWord}>Warning.</span> {view.warning}
        </p>
      )}
      {view.refusal && <p className={s.refusalNote}>{view.refusal}</p>}
    </div>
  )
}

/** Until the reader steps it, the phone plays the same recorded runs as the Home instrument, two steps behind. */
function HeroPhone() {
  const load = useFixtures(HERO_RECORDING_IDS)
  const reduced = useReducedMotion()
  const counts = useMemo(
    () => (load.status === 'ready' ? load.fixtures.map((f) => f.steps.length) : null),
    [load],
  )
  // The phone drives the shared loop itself: no instrument card is mounted on this page.
  useHeroDriver(counts, reduced)
  const tick = useHeroLoop((st) => st.state.tick)
  if (load.status !== 'ready') {
    return (
      <PhoneScreen
        view={{
          status: 'Loading',
          headline: 'Loading.',
          confidence: null,
          lastReading: null,
          warning: null,
          refusal: null,
        }}
      />
    )
  }
  const { recording, readings } = phonePositionAt(counts ?? [], tick)
  const fx = load.fixtures[recording]!
  const f = heroFrame(fx, HERO_RECORDING_IDS[recording]!, readings)
  const spec = DOMAINS[fx.domain]
  const isDone = f.isResolved || f.unresolvedText !== null
  return (
    <PhoneScreen
      view={{
        status: isDone ? 'Replay, finished' : 'Replay, recorded',
        headline:
          f.isResolved && f.diagnosis
            ? `${f.diagnosis.label}.`
            : f.unresolvedText
              ? 'Unresolved.'
              : f.instruction,
        confidence: f.isResolved && f.diagnosis ? f.diagnosis.p : null,
        lastReading: f.readingDigits ? `${f.readingDigits} ${spec.unit}` : null,
        warning: f.warning
          ? `Your probe is not where you think it is. Most likely ${f.warning.likelyLabel}.`
          : null,
        refusal: f.unresolvedText,
      }}
    />
  )
}

/** After the reader presses the button, the phone is the real session store in replay mode. */
function SessionPhone({ fixture }: { fixture: FixtureT | null }) {
  const phase = useSession((st) => st.phase)
  const catalog = useSession((st) => st.catalog)
  const instruction = useSession((st) => st.instruction)
  const last = useSession((st) => st.readings[st.readings.length - 1] ?? null)
  const warning = useSession((st) => st.warning)
  const diagnosis = useSession((st) => st.diagnosis)
  const domain = useSession((st) => st.domain)
  const spec = DOMAINS[domain]

  const idleLabel = fixture ? siteLabel(fixture, fixture.prior_instruction.site) : null
  const site = instruction && catalog ? catalog.sites[instruction.site] : undefined
  const headline =
    diagnosis && phase === 'resolved'
      ? `${diagnosis.label}.`
      : site
        ? spec.phrases.instruction(site)
        : fixture && idleLabel
          ? DOMAINS[fixture.domain].phrases.instruction({
              index: fixture.prior_instruction.site,
              label: idleLabel,
              spoken: idleLabel,
            })
          : 'Loading.'
  return (
    <PhoneScreen
      view={{
        status:
          phase === 'idle'
            ? 'Replay, ready'
            : phase === 'resolved'
              ? 'Replay, resolved'
              : 'Replay, listening',
        headline,
        confidence: diagnosis && phase === 'resolved' ? diagnosis.confidence : null,
        lastReading: last ? `${last.value.toFixed(spec.readingDecimals)} ${spec.unit}` : null,
        warning: warning && phase !== 'resolved' ? warning.text.replace(/^Warning\.\s*/, '') : null,
        refusal: null,
      }}
    />
  )
}

interface PhonePreviewProps {
  fixture: FixtureT | null
  onStep(): void
}

/**
 * The phone text channel. Until the reader presses the button it follows the Home instrument's
 * recordings, two steps behind; after that it is the real session store in replay mode.
 */
export function PhonePreview({ fixture, onStep }: PhonePreviewProps) {
  const phase = useSession((st) => st.phase)
  const [isStepped, setStepped] = useState(false)
  const isBusy = phase === 'submitting' || phase === 'revealing' || phase === 'starting'
  return (
    <div className="flex flex-col items-center gap-6">
      {isStepped ? <SessionPhone fixture={fixture} /> : <HeroPhone />}
      <button
        type="button"
        className={buttonClass('secondary')}
        aria-disabled={isBusy || undefined}
        onClick={() => {
          if (isBusy) return
          setStepped(true)
          onStep()
        }}
      >
        Next recorded reading
      </button>
      <Caption>
        {isStepped
          ? 'Phone preview: the recorded worked example, one reading at a time, from a simulated hand.'
          : `Phone preview: recorded runs from a simulated hand, ${countWord(PHONE_LAG_STEPS)} steps behind the instrument on the home page. Press the button to step the worked example yourself.`}
      </Caption>
    </div>
  )
}
