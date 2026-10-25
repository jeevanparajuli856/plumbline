import { Link } from 'react-router'
import { buttonClass } from '@/ui/button'
import { HERO_LEAD, PRODUCT_LINE } from '../content'
import s from '../landing.module.css'
import { Eyebrow, Section } from '../parts'
import { cx } from '../cx'
import { LiveInstrument } from './LiveInstrument'

interface HeroProps {
  reduced: boolean
}

/** Home hero, product showcase: the promise and one action on the left, the app running live on the right. */
export function Hero({ reduced }: HeroProps) {
  return (
    <Section id="hero" className={cx(s.section, s.mast)}>
      <div className={cx(s.frame, s.grid, 'w-full items-center gap-y-14')}>
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
          <p className={cx(s.lead, 'mt-8')}>{HERO_LEAD}</p>
          <p className={cx(s.productLine, 'mt-6')}>{PRODUCT_LINE}</p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link to="/sim" className={buttonClass('primary')}>
              Try Truehand
            </Link>
            <Link to="/how-it-works" className={buttonClass('secondary')}>
              See how it works
            </Link>
          </div>
        </div>
        <div className="col-span-4 md:col-span-12 lg:col-span-5 lg:col-start-8">
          <LiveInstrument reduced={reduced} />
        </div>
      </div>
    </Section>
  )
}
