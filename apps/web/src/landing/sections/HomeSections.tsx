import { Link } from 'react-router'
import { buttonClass } from '@/ui/button'
import { OUTCOMES, PROMISE, STATUS_LINE, VALIDATION_STATS } from '../content'
import s from '../landing.module.css'
import { Caption, Eyebrow, Section } from '../parts'
import { cx } from '../cx'
import { StatGrid } from './StatGrid'

/** Home proof shows these cells; the full grid lives on Evidence. */
const PROOF_STAT_IDS = ['correct', 'confidently-wrong']

/** What changes for the user, as a ruled list of three outcomes (not cards). */
export function Outcomes() {
  return (
    <Section id="outcomes" className={cx(s.section, s.sectionTight, s.sheet)}>
      <div className={cx(s.frame, s.grid, 'gap-y-10')}>
        <div className="col-span-4 md:col-span-4">
          <Eyebrow>What changes</Eyebrow>
          <h2 id="outcomes-title" className={cx(s.h2, 'mt-6')}>
            You stop checking. It checks for you.
          </h2>
        </div>
        <ol className={cx(s.outcomes, 'col-span-4 md:col-span-8')}>
          {OUTCOMES.map((o) => (
            <li key={o.name} className={s.outcome}>
              <h3 className={s.h3}>{o.name}</h3>
              <p className={s.body}>{o.sentence}</p>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  )
}

/** Two validation numbers, labeled simulated, with the way to the full evidence. */
export function Proof() {
  const stats = VALIDATION_STATS.filter((st) => PROOF_STAT_IDS.includes(st.id))
  return (
    <Section id="proof" className={cx(s.section, s.sectionTight, s.band)}>
      <div className={cx(s.frame, s.grid, 'items-end gap-y-10')}>
        <div className="col-span-4 md:col-span-5">
          <Eyebrow>Proof so far</Eyebrow>
          <h2 id="proof-title" className={cx(s.h2, 'mt-6')}>
            {STATUS_LINE}
          </h2>
          <p className={cx(s.body, 'mt-6 text-text-2')}>
            These results come from simulated faults and a simulated hand. Sessions with blind
            participants come next.
          </p>
          <Link to="/evidence" className={cx(buttonClass('secondary'), 'mt-8')}>
            See the evidence
          </Link>
        </div>
        <div className="col-span-4 md:col-span-7">
          <StatGrid stats={stats} />
        </div>
      </div>
    </Section>
  )
}

/** Ink band: the promise and the exits. */
export function HomeCta() {
  return (
    <Section id="cta" className={cx(s.section, s.sectionTight, s.ink)}>
      <div className={cx(s.frame, s.grid, 'items-end gap-y-10')}>
        <h2 id="cta-title" className={cx(s.h2, 'col-span-4 md:col-span-8')}>
          {PROMISE}
        </h2>
        <div className="col-span-4 flex flex-wrap gap-4 md:col-span-4 md:justify-end">
          <Link to="/sim" className={s.inkPrimary}>
            Open the web app
          </Link>
          <Link to="/contact" className={s.inkButton}>
            Talk to us about a pilot
          </Link>
        </div>
        <Caption className="col-span-4 md:col-span-8">
          Right edge of the page: a column of identical holes, like a braille cell or a breadboard.
          The ringed dot moves to your place on the page; it is decoration and carries no data.
        </Caption>
      </div>
    </Section>
  )
}
