import { Link } from 'react-router'
import { buttonClass } from '@/ui/button'
import { BUYERS, CONTACT_EMAIL, MODES, PRODUCT_LINE } from '@/landing/content'
import { cx } from '@/landing/cx'
import s from '@/landing/landing.module.css'
import { MarketingPage } from '@/landing/MarketingPage'
import { Eyebrow, PhotoFigure, Section } from '@/landing/parts'
import { PHOTOS } from '@/landing/photos'
import pr from '@/landing/product.module.css'
import { PhonePreview } from '@/landing/sections/PhonePreview'
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
              Truehand runs beside the talking meter you already own. It speaks every instruction,
              takes each reading by voice or keyboard, and works with the screen reader on your
              phone or computer.
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
          <div className="col-span-4 md:col-span-5">
            <PhotoFigure photo={PHOTOS.breadboardWired} sizes="(min-width: 768px) 40vw, 100vw" />
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
              The words are the product.
            </h2>
            <p className={cx(s.lead, 'mt-6')}>
              Every state is a sentence first: the instruction, the reading it heard, the warning,
              the answer. The phone&apos;s own screen reader speaks it; nothing depends on seeing
              the screen.
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
              Open the web app
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
