import { Link } from 'react-router'
import { buttonClass } from '@/ui/button'
import { BUYERS, CONTACT_EMAIL, MODES, PRODUCT_LINE } from '@/landing/content'
import { cx } from '@/landing/cx'
import s from '@/landing/landing.module.css'
import { MarketingPage } from '@/landing/MarketingPage'
import { Eyebrow, Section } from '@/landing/parts'
import pr from '@/landing/product.module.css'
import { AnswerPhone, PhonePreview } from '@/landing/sections/PhonePreview'
import { useWorkedReplay } from '@/landing/useWorkedReplay'

/** The app: what the user does and what they get, the modes, the phone preview, who buys it. */
export function AppPage() {
  const { load, step } = useWorkedReplay()
  const fixture = load.status === 'ready' ? load.fixture : null
  return (
    <MarketingPage hasEdgeColumn>
      <Section id="app" className={cx(s.section, s.sheet)}>
        <div className={cx(s.frame, s.grid, 'items-center gap-y-10')}>
          <div className="col-span-4 md:col-span-7">
            <Eyebrow>The app</Eyebrow>
            <h1 id="app-title" tabIndex={-1} className={cx(s.display, 'mt-8')}>
              Your meter, with a second pair of eyes.
            </h1>
            <p className={cx(s.h3, 'mt-8 font-normal')}>{PRODUCT_LINE}</p>
            <p className={cx(s.lead, 'mt-6')}>
              Truehand works with the talking meter you already own. It tells you where to probe,
              takes each reading by voice or keyboard, catches a slipped probe and names the fault.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/sim" className={buttonClass('primary')}>
                Try Truehand
              </Link>
              <Link to="/accessibility" className={buttonClass('secondary')}>
                Accessibility
              </Link>
            </div>
          </div>
          <div className="col-span-4 flex justify-center md:col-span-5">
            <AnswerPhone fixture={fixture} />
          </div>
        </div>
      </Section>

      <Section id="modes" className={cx(s.section, s.sectionTight, s.band)}>
        <div className={cx(s.frame, s.grid, 'gap-y-10')}>
          <div className="col-span-4 md:col-span-4">
            <Eyebrow>Modes</Eyebrow>
            <h2 id="modes-title" className={cx(s.h2, 'mt-6')}>
              Three ways to use it
            </h2>
          </div>
          <ul data-motion="rows" className={cx(pr.productRows, 'col-span-4 md:col-span-8')}>
            {MODES.map((m) => (
              <li key={m.name} className={pr.productRow}>
                <p className={pr.productName}>{m.name}</p>
                <p className="text-base leading-relaxed text-text-2">{m.sentence}</p>
                <p className={pr.productStatus}>{m.tag}</p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section id="phone" className={cx(s.section, s.sectionTight, s.sheet)}>
        <div className={cx(s.frame, s.grid, 'items-center gap-y-10')}>
          <div className="col-span-4 md:col-span-6">
            <Eyebrow>On the phone</Eyebrow>
            <h2 id="phone-title" className={cx(s.h2, 'mt-6')}>
              Hear where to probe. Say the reading.
            </h2>
            <p className={cx(s.lead, 'mt-6')}>
              Get warned when the probe slips, and an answer only when Truehand is sure. One app for
              the web now and iPhone next, with every step spoken by the screen reader you already
              use.
            </p>
          </div>
          <div className="col-span-4 md:col-span-5 md:col-start-8">
            <PhonePreview fixture={fixture} onStep={() => void step()} />
          </div>
        </div>
      </Section>

      <Section id="buyers" className={cx(s.section, s.sectionTight, s.band)}>
        <div className={cx(s.frame, s.grid, 'gap-y-10')}>
          <div className="col-span-4 md:col-span-4">
            <Eyebrow>Who buys it</Eyebrow>
            <h2 id="buyers-title" className={cx(s.h2, 'mt-6')}>
              For the people who equip technicians
            </h2>
          </div>
          <ul className={cx(s.outcomes, 'col-span-4 md:col-span-8')}>
            {BUYERS.map((b) => (
              <li key={b.name} className={s.outcome}>
                <h3 className={s.h3}>{b.name}</h3>
                <p className={s.body}>{b.sentence}</p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section id="cta" className={cx(s.section, s.sectionTight, s.ink)}>
        <div className={cx(s.frame, s.grid, 'items-end gap-y-8')}>
          <h2 id="cta-title" className={cx(s.h2, 'col-span-4 md:col-span-7')}>
            Try it in your browser today, or run a pilot with your students.
          </h2>
          <div className="col-span-4 flex flex-wrap gap-4 md:col-span-5 md:justify-end">
            <Link to="/sim" className={s.inkPrimary}>
              Try Truehand
            </Link>
            <Link to="/contact" className={s.inkButton}>
              Write to {CONTACT_EMAIL}
            </Link>
          </div>
        </div>
      </Section>
    </MarketingPage>
  )
}
