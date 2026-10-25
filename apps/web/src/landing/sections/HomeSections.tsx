import { Link } from 'react-router'
import { buttonClass } from '@/ui/button'
import { PROMISE, VALIDATION_STATS } from '../content'
import s from '../landing.module.css'
import { Eyebrow, Section } from '../parts'
import { cx } from '../cx'
import { StatGrid } from './StatGrid'

/** Home proof shows these cells; the full grid lives on Evidence. */
const PROOF_STAT_IDS = ['correct', 'confidently-wrong']

/** A confident results strip: two numbers, each with its small simulated label, and the way to the evidence. */
export function Proof() {
  const stats = VALIDATION_STATS.filter((st) => PROOF_STAT_IDS.includes(st.id))
  return (
    <Section id="proof" reveal="up" className={cx(s.section, s.sectionTight, s.band)}>
      <div className={cx(s.frame, s.grid, 'items-end gap-y-10')}>
        <div className="col-span-4 md:col-span-5">
          <Eyebrow>Results</Eyebrow>
          <h2 id="proof-title" className={cx(s.h2, 'mt-6')}>
            It catches the slip a conventional assistant misses.
          </h2>
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
    <Section id="cta" reveal="mask" className={cx(s.section, s.sectionTight, s.feature)}>
      <div className={cx(s.frame, s.grid, 'items-end gap-y-10')}>
        <h2 id="cta-title" className={cx(s.h2, 'col-span-4 md:col-span-8')}>
          {PROMISE}
        </h2>
        <div className="col-span-4 flex flex-wrap gap-4 md:col-span-4 md:justify-end">
          <Link to="/sim" className={s.featurePrimary}>
            Try Truehand
          </Link>
          <Link to="/contact" className={s.featureButton}>
            Talk to us about a pilot
          </Link>
        </div>
      </div>
    </Section>
  )
}
