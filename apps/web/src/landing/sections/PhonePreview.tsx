import { useMemo, useState } from 'react'
import { useReducedMotion } from '@/a11y/useReducedMotion'
import type { FixtureT } from '@/engine/schemas'
import { DOMAINS } from '@/state/domains'
import { useSession } from '@/state/session'
import { buttonClass } from '@/ui/button'
import s from '../landing.module.css'
import { Caption } from '../parts'
import { heroFrame } from '../heroFrame'
import {
  HERO_RECORDING_IDS,
  PHONE_LAG_STEPS,
  phonePositionAt,
  useHeroDriver,
  useHeroLoop,
} from '../heroLoop'
import { countWord } from '../numberWords'
import { viewFromFrame, viewFromSession, type AppScreenView } from '../phone/appScreen'
import { IPhone } from '../phone/IPhone'
import { useFixtures } from '../useFixture'
import { siteLabel } from '../workedExample'

const LOADING_VIEW: AppScreenView = {
  mode: 'Recorded run',
  step: 'Ready',
  instruction: 'Loading.',
  reading: null,
  warning: null,
  verdict: null,
  belief: [],
}

/** Until the reader steps it, the phone plays the recorded runs, two steps behind the Home loop. */
function LoopPhone() {
  const load = useFixtures(HERO_RECORDING_IDS)
  const reduced = useReducedMotion()
  const counts = useMemo(
    () => (load.status === 'ready' ? load.fixtures.map((f) => f.steps.length) : null),
    [load],
  )
  // The phone drives the shared loop itself: no live instrument is mounted on this page.
  useHeroDriver(counts, reduced)
  const tick = useHeroLoop((st) => st.state.tick)
  if (load.status !== 'ready' || !counts) return <IPhone view={LOADING_VIEW} frameKey="loading" />
  const { recording, readings } = phonePositionAt(counts, tick)
  const f = heroFrame(load.fixtures[recording]!, HERO_RECORDING_IDS[recording]!, readings)
  return <IPhone view={viewFromFrame(f)} frameKey={String(tick)} />
}

/** After the reader presses the button, the phone is the real session store in replay mode. */
function SessionPhone({ fixture }: { fixture: FixtureT | null }) {
  const phase = useSession((st) => st.phase)
  const catalog = useSession((st) => st.catalog)
  const instruction = useSession((st) => st.instruction)
  const readings = useSession((st) => st.readings)
  const warning = useSession((st) => st.warning)
  const diagnosis = useSession((st) => st.diagnosis)
  const unresolved = useSession((st) => st.unresolved)
  const belief = useSession((st) => st.belief)
  const domain = useSession((st) => st.domain)
  const spec = DOMAINS[domain]
  const site = instruction && catalog ? catalog.sites[instruction.site] : undefined
  const idleLabel = fixture ? siteLabel(fixture, fixture.prior_instruction.site) : null
  const text = site
    ? spec.phrases.instruction(site)
    : fixture && idleLabel
      ? DOMAINS[fixture.domain].phrases.instruction({
          index: fixture.prior_instruction.site,
          label: idleLabel,
          spoken: idleLabel,
        })
      : null
  const last = readings[readings.length - 1]
  const view = viewFromSession({
    phase,
    instruction: text,
    readingsCount: readings.length,
    lastReading: last
      ? { digits: last.value.toFixed(spec.readingDecimals), unit: spec.unit }
      : null,
    warningText: warning?.text ?? null,
    diagnosis: diagnosis ? { label: diagnosis.label, confidence: diagnosis.confidence } : null,
    unresolvedText: unresolved?.text ?? null,
    belief: belief.map((p, i) => ({ label: catalog?.hypotheses[i]?.label ?? '', p })),
  })
  return <IPhone view={view} frameKey={String(readings.length)} />
}

interface PhonePreviewProps {
  fixture: FixtureT | null
  onStep(): void
}

/** The phone preview on The app: recorded runs on a loop, until the reader steps the worked example. */
export function PhonePreview({ fixture, onStep }: PhonePreviewProps) {
  const phase = useSession((st) => st.phase)
  const [isStepped, setStepped] = useState(false)
  const isBusy = phase === 'submitting' || phase === 'revealing' || phase === 'starting'
  return (
    <div className={s.liveInstrument}>
      <div role="group" aria-label="Phone preview of the text channel">
        {isStepped ? <SessionPhone fixture={fixture} /> : <LoopPhone />}
      </div>
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
      <Caption className={s.liveCaption}>
        {isStepped
          ? 'Phone preview: the recorded worked example, one reading at a time, from a simulated hand.'
          : `Phone preview: recorded runs from a simulated hand, ${countWord(PHONE_LAG_STEPS)} steps behind the phone on the home page. Press the button to step the worked example yourself.`}
      </Caption>
    </div>
  )
}
