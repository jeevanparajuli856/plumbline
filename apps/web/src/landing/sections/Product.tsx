import { useState } from 'react'
import type { FixtureT } from '@/engine/schemas'
import { formatPct } from '@/lib/format'
import { DOMAINS } from '@/state/domains'
import { useSession } from '@/state/session'
import { buttonClass } from '@/ui/button'
import { PRODUCT_LINE, PRODUCTS } from '../content'
import s from '../landing.module.css'
import { Caption, Eyebrow, Section, WarningGlyph } from '../parts'
import { cx } from '../cx'
import { heroFrame } from '../heroFrame'
import { HERO_RECORDING_IDS, PHONE_LAG_STEPS, phonePositionAt, useHeroLoop } from '../heroLoop'
import { countWord } from '../numberWords'
import { useFixtures } from '../useFixture'
import { siteLabel } from '../workedExample'

interface ProductProps {
  fixture: FixtureT | null
  onStep(): void
}

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
    <div className={s.phone} role="group" aria-label="Phone preview of the text channel">
      <div className={s.phoneBar}>
        <span>Plumbline</span>
        <span>{view.status}</span>
      </div>
      <p className={s.phoneInstruction}>{view.headline}</p>
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

/** Until the reader steps it, the phone follows the hero instrument a little behind. */
function HeroPhone() {
  const load = useFixtures(HERO_RECORDING_IDS)
  const tick = useHeroLoop((st) => st.state.tick)
  if (load.status !== 'ready') {
    return (
      <PhoneScreen
        view={{ status: 'Loading', headline: 'Loading.', confidence: null, lastReading: null, warning: null, refusal: null }}
      />
    )
  }
  const counts = load.fixtures.map((f) => f.steps.length)
  const { recording, readings } = phonePositionAt(counts, tick)
  const fx = load.fixtures[recording]!
  const f = heroFrame(fx, HERO_RECORDING_IDS[recording]!, readings)
  const spec = DOMAINS[fx.domain]
  const isDone = f.isResolved || f.unresolvedText !== null
  return (
    <PhoneScreen
      view={{
        status: isDone ? 'Replay, finished' : 'Replay, listening',
        headline: f.isResolved && f.diagnosis ? `${f.diagnosis.label}.` : f.unresolvedText ? 'Unresolved.' : f.instruction,
        confidence: f.isResolved && f.diagnosis ? f.diagnosis.p : null,
        lastReading: f.readingDigits ? `${f.readingDigits} ${spec.unit}` : null,
        warning: f.warning ? `Your probe is not where you think it is. Most likely ${f.warning.likelyLabel}.` : null,
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
        status: phase === 'idle' ? 'Replay, ready' : phase === 'resolved' ? 'Replay, resolved' : 'Replay, listening',
        headline,
        confidence: diagnosis && phase === 'resolved' ? diagnosis.confidence : null,
        lastReading: last ? `${last.value.toFixed(spec.readingDecimals)} ${spec.unit}` : null,
        warning: warning && phase !== 'resolved' ? warning.text.replace(/^Warning\.\s*/, '') : null,
        refusal: null,
      }}
    />
  )
}

export function Product({ fixture, onStep }: ProductProps) {
  const phase = useSession((st) => st.phase)
  const [isStepped, setStepped] = useState(false)
  const isBusy = phase === 'submitting' || phase === 'revealing' || phase === 'starting'
  return (
    <Section id="product" className={cx(s.section, s.sheet, s.ruleTop)}>
      <div className={cx(s.frame, s.grid, 'items-start gap-y-12')}>
        <div className="col-span-4 md:col-span-12 lg:col-span-7">
          <Eyebrow>The product</Eyebrow>
          <h2 id="product-title" className={cx(s.h2, 'mt-6')}>
            {PRODUCT_LINE}
          </h2>
          <p className={cx(s.lead, 'mt-6')}>
            The product is the text and voice channel. A blind user hears the instruction, says the
            reading, and hears the warning. The 3D view on this page is for people who can see it;
            everything it shows is also in words.
          </p>
          <ul data-motion="rows" className={cx(s.productRows, 'mt-12')} aria-label="Products">
            {PRODUCTS.map((p, i) => (
              <li key={p.name} className={s.productRow}>
                <p className={s.productName}>{p.name}</p>
                <p className="text-base leading-relaxed text-text-2">{p.sentence}</p>
                <p className={cx(s.productStatus, i === 0 && s.productStatusNow)}>{p.status}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="col-span-4 flex flex-col items-center gap-6 md:col-span-12 lg:col-span-4 lg:col-start-9">
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
              ? 'Phone preview: the same session store the simulator uses, in replay mode, with the recorded worked example. The button steps it one reading at a time.'
              : `Phone preview: the instrument at the top of the page, ${countWord(PHONE_LAG_STEPS)} steps behind. Press the button to step the recorded worked example yourself.`}
          </Caption>
        </div>
      </div>
    </Section>
  )
}
