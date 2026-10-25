import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { buttonClass } from '@/ui/button'
import { PRODUCT_LINE, STATUS_LINE } from '../content'
import s from '../landing.module.css'
import { Caption, Eyebrow, Section } from '../parts'
import { cx } from '../cx'
import { HERO_INSTRUCTION_MS } from '../heroLoop'
import { InstrumentCard } from './InstrumentCard'

interface MastProps {
  reduced: boolean
  onPlay(): void
}

/** The status lines arrive when the hero card's first recorded reading lands. */
const AFTER_FIRST_READING = { animationDelay: `${HERO_INSTRUCTION_MS}ms` } as CSSProperties

export function Mast({ reduced, onPlay }: MastProps) {
  return (
    <Section id="mast" className={cx(s.section, s.mast)}>
      <div className={cx(s.frame, s.grid, 'w-full gap-y-14')}>
        <div className={cx('col-span-4 md:col-span-12 lg:col-span-7', s.mastText)}>
          <Eyebrow>
            Research preview. Trustworthy measurement for hands that cannot see the tool
          </Eyebrow>
          <h1 id="mast-title" data-motion="headline" className={cx(s.display, s.headline, 'mt-8')}>
            Measurement you can trust without looking.
          </h1>
          <p className={cx(s.lead, 'mt-8')}>
            When a blind person measures a circuit, nothing checks whether the probe landed where it
            was told. Truehand works out the fault and the row the probe actually found from each
            reading, and it refuses to guess when the physics cannot tell two faults apart.
          </p>
          <dl
            className={cx(s.statusList, s.afterFirstReading, 'mt-10 max-w-[36rem]')}
            style={reduced ? undefined : AFTER_FIRST_READING}
          >
            <dt className={s.label}>Status</dt>
            <dd>{STATUS_LINE}</dd>
            <dt className={s.label}>Product</dt>
            <dd>{PRODUCT_LINE}</dd>
          </dl>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button type="button" className={buttonClass('primary')} onClick={onPlay}>
              Go to the worked example and play it
            </button>
            <Link to="/sim" className={buttonClass('secondary')}>
              Open the simulator
            </Link>
          </div>
          <Caption className="mt-12">
            Right edge of the page: a column of identical holes, like a braille cell or a
            breadboard. The ringed dot moves to your place on the page; it is decoration and carries
            no data.
          </Caption>
        </div>
        <div className="col-span-4 md:col-span-8 md:col-start-3 lg:col-span-5 lg:col-start-8">
          <InstrumentCard reduced={reduced} />
        </div>
      </div>
    </Section>
  )
}
