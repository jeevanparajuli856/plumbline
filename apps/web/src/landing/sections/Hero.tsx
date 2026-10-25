import { Link } from 'react-router'
import { buttonClass } from '@/ui/button'
import { useCircuitDrift } from '../circuitDrift'
import { HERO_LEAD } from '../content'
import s from '../landing.module.css'
import { Caption, Eyebrow, Section } from '../parts'
import { cx } from '../cx'
import { LiveInstrument } from './LiveInstrument'

interface HeroProps {
  reduced: boolean
}

/** Home hero: the promise on the left, the app on three phones, the live circuit behind them. */
export function Hero({ reduced }: HeroProps) {
  useCircuitDrift(!reduced)
  return (
    <Section id="hero" sceneKey="mast" className={cx(s.section, s.mast, s.sceneSection)}>
      <div className={cx(s.frame, s.grid, 'w-full items-center gap-y-8 lg:gap-y-14')}>
        <div className={cx('col-span-4 md:col-span-12 lg:col-span-6', s.mastText)}>
          <Eyebrow>Built for blind and low-vision hands</Eyebrow>
          <h1
            id="hero-title"
            tabIndex={-1}
            data-motion="headline"
            className={cx(s.display, s.headline, 'mt-5 lg:mt-8')}
          >
            Measurement you can trust without looking.
          </h1>
          <p className={cx(s.lead, 'mt-4 lg:mt-6')}>{HERO_LEAD}</p>
          <Caption>
            Scene: a breadboard circuit on the bench, the red probe above a row, behind the phones.
          </Caption>
          <div className="mt-6 flex flex-wrap items-center gap-3 lg:mt-10">
            <Link to="/sim" className={buttonClass('primary', 'rounded-full px-6')}>
              Try Truehand
            </Link>
            <Link to="/how-it-works" className={buttonClass('secondary', 'rounded-full px-6')}>
              See how it works
            </Link>
          </div>
        </div>
        <div className={cx('col-span-4 md:col-span-12 lg:col-span-6', s.mastPhones)}>
          <LiveInstrument reduced={reduced} />
        </div>
      </div>
    </Section>
  )
}
