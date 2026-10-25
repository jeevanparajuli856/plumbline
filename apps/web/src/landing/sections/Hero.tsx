import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { buttonClass } from '@/ui/button'
import { PRODUCT_LINE, STATUS_LINE } from '../content'
import s from '../landing.module.css'
import { Eyebrow, Section } from '../parts'
import { cx } from '../cx'
import { HERO_INSTRUCTION_MS } from '../heroLoop'
import { InstrumentCard } from './InstrumentCard'

interface HeroProps {
  reduced: boolean
}

/** The status lines arrive when the hero card's first recorded reading lands. */
const AFTER_FIRST_READING = { animationDelay: `${HERO_INSTRUCTION_MS}ms` } as CSSProperties

/** Home hero, 7:5: the promise and one action on the left, the live instrument on the right. */
export function Hero({ reduced }: HeroProps) {
  return (
    <Section id="hero" className={cx(s.section, s.mast)}>
      <div className={cx(s.frame, s.grid, 'w-full gap-y-14')}>
        <div className={cx('col-span-4 md:col-span-12 lg:col-span-7', s.mastText)}>
          <Eyebrow>Trustworthy measurement for hands that cannot see the tool</Eyebrow>
          <h1
            id="hero-title"
            tabIndex={-1}
            data-motion="headline"
            className={cx(s.display, s.headline, 'mt-8')}
          >
            Measurement you can trust without looking.
          </h1>
          <p className={cx(s.lead, 'mt-8')}>
            A blind technician hears every reading, but nothing checks where the probe actually
            landed. Truehand tells you where to probe, warns you when the probe slipped, and names
            the fault only when the readings agree.
          </p>
          <dl
            className={cx(s.statusList, s.afterFirstReading, 'mt-10 max-w-[38rem]')}
            style={reduced ? undefined : AFTER_FIRST_READING}
          >
            <dt className={s.label}>Product</dt>
            <dd>{PRODUCT_LINE}</dd>
            <dt className={s.label}>Status</dt>
            <dd>{STATUS_LINE}</dd>
          </dl>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link to="/sim" className={buttonClass('primary')}>
              Try Truehand
            </Link>
            <Link to="/how-it-works" className={buttonClass('secondary')}>
              See how it works
            </Link>
          </div>
        </div>
        <div className="col-span-4 md:col-span-8 md:col-start-3 lg:col-span-5 lg:col-start-8">
          <InstrumentCard reduced={reduced} />
        </div>
      </div>
    </Section>
  )
}
