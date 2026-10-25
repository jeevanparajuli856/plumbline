import type { FixtureT } from '@/engine/schemas'
import { formatPct } from '@/lib/format'
import { DOMAINS } from '@/state/domains'
import { useSession } from '@/state/session'
import { PRODUCT_LINE } from '../content'
import s from '../landing.module.css'
import { Caption, Eyebrow, Section } from '../parts'
import { cx } from '../cx'
import { siteLabel } from '../workedExample'

interface ProductProps {
  fixture: FixtureT | null
  onStep(): void
}

/** The phone text channel, driven by the real session store in replay. Not a picture. */
function PhoneChannel({ fixture }: { fixture: FixtureT | null }) {
  const phase = useSession((st) => st.phase)
  const catalog = useSession((st) => st.catalog)
  const instruction = useSession((st) => st.instruction)
  const last = useSession((st) => st.readings[st.readings.length - 1] ?? null)
  const warning = useSession((st) => st.warning)
  const diagnosis = useSession((st) => st.diagnosis)
  const domain = useSession((st) => st.domain)
  const spec = DOMAINS[domain]

  const idleLabel = fixture ? siteLabel(fixture, fixture.prior_instruction.site) : null
  const idleSite =
    fixture && idleLabel
      ? { index: fixture.prior_instruction.site, label: idleLabel, spoken: idleLabel }
      : null
  const site = instruction && catalog ? catalog.sites[instruction.site] : undefined
  const headline =
    diagnosis && phase === 'resolved'
      ? `${diagnosis.label}.`
      : site
        ? spec.phrases.instruction(site)
        : fixture && idleSite
          ? DOMAINS[fixture.domain].phrases.instruction(idleSite)
          : 'Loading.'

  return (
    <div className={s.phone} role="group" aria-label="Phone preview of the text channel">
      <p className={cx(s.mono, 'text-base text-text-2')}>
        {phase === 'idle'
          ? 'Replay, ready'
          : phase === 'resolved'
            ? 'Replay, resolved'
            : 'Replay, listening'}
      </p>
      <p className={s.phoneInstruction}>{headline}</p>
      {diagnosis && phase === 'resolved' && (
        <p className="text-lg">
          Confidence <span className={s.mono}>{formatPct(diagnosis.confidence)}</span>
        </p>
      )}
      {last && (
        <p className="text-lg">
          Last reading{' '}
          <span className={cx(s.mono, 'font-semibold text-measured')}>
            {last.value.toFixed(spec.readingDecimals)} {spec.unit}
          </span>
        </p>
      )}
      {warning && phase !== 'resolved' && (
        <p className={s.warning}>
          <span aria-hidden="true">&#x26A0;&#xFE0E; </span>
          <span className={s.warningWord}>Warning.</span>{' '}
          {warning.text.replace(/^Warning\.\s*/, '')}
        </p>
      )}
    </div>
  )
}

export function Product({ fixture, onStep }: ProductProps) {
  const phase = useSession((st) => st.phase)
  const isBusy = phase === 'submitting' || phase === 'revealing' || phase === 'starting'
  return (
    <Section id="product" className={cx(s.section, s.sheet)}>
      <div className={cx(s.frame, s.grid, 'items-center gap-y-12')}>
        <div className="col-span-4 md:col-span-6">
          <Eyebrow>The product</Eyebrow>
          <h2 id="product-title" className={cx(s.h2, 'mt-6')}>
            {PRODUCT_LINE}
          </h2>
          <p className={cx(s.lead, 'mt-6')}>
            The product is the text and voice channel. A blind user hears the instruction, says the
            reading, and hears the warning. The 3D view on this page is for people who can see it;
            everything it shows is also in words.
          </p>
          <p className={cx(s.body, 'mt-6')}>
            The iOS app wraps this same web app, so the phone&apos;s own screen reader speaks every
            state. The preview on the right is the live text channel running the recorded example,
            not a screenshot.
          </p>
          <div className="mt-8">
            <button
              type="button"
              className={s.button}
              aria-disabled={isBusy || undefined}
              onClick={() => !isBusy && onStep()}
            >
              {phase === 'resolved' ? 'Start the phone preview over' : 'Next reading on the phone'}
            </button>
          </div>
          <Caption className="mt-8">
            Phone preview: the same session store the simulator uses, in replay mode, with the
            recorded worked example.
          </Caption>
        </div>
        <div className="col-span-4 flex justify-center md:col-span-5 md:col-start-8">
          <PhoneChannel fixture={fixture} />
        </div>
      </div>
    </Section>
  )
}
