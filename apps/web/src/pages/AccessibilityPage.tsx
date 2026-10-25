import { CONTACT_EMAIL } from '@/landing/content'
import { cx } from '@/landing/cx'
import s from '@/landing/landing.module.css'
import { MarketingPage } from '@/landing/MarketingPage'
import { Eyebrow, Section } from '@/landing/parts'
import { DisplaySettings } from '@/ui/DisplaySettings'

const COMMITMENTS: readonly { name: string; sentence: string }[] = [
  {
    name: 'Screen reader first',
    sentence: 'Every instruction, reading, warning and answer is text the screen reader speaks.',
  },
  {
    name: 'Voice is optional',
    sentence: 'Speech stays off until you turn it on. Typing a reading always works.',
  },
  {
    name: 'Keyboard throughout',
    sentence: 'Every control is reachable by keyboard, with a visible focus ring.',
  },
  {
    name: 'Nothing only in pictures',
    sentence: 'Everything the pictures and the 3D view show is also in words.',
  },
]

/** Accessibility: the commitment, the real display controls, and how to report a barrier. */
export function AccessibilityPage() {
  return (
    <MarketingPage>
      <Section id="commitment" className={cx(s.section, s.sheet)}>
        <div className={cx(s.frame, s.grid, 'gap-y-10')}>
          <div className="col-span-4 md:col-span-5">
            <Eyebrow>Accessibility</Eyebrow>
            <h1 id="commitment-title" tabIndex={-1} className={cx(s.h2, 'mt-6')}>
              Built for people who cannot see the screen.
            </h1>
            <p className={cx(s.lead, 'mt-6')}>
              The people Truehand serves are blind or have low vision, so the spoken and written
              channel is the product, not an add-on.
            </p>
          </div>
          <ul className={cx(s.outcomes, 'col-span-4 md:col-span-7')}>
            {COMMITMENTS.map((c) => (
              <li key={c.name} className={s.outcome}>
                <h3 className={s.h3}>{c.name}</h3>
                <p className={s.body}>{c.sentence}</p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section id="settings" className={cx(s.section, s.sectionTight, s.band)}>
        <div className={cx(s.frame, s.grid, 'gap-y-8')}>
          <div className="col-span-4 md:col-span-5">
            <Eyebrow>Settings</Eyebrow>
            <h2 id="settings-title" className={cx(s.h2, 'mt-6')}>
              Display settings
            </h2>
            <p className={cx(s.body, 'mt-6 text-text-2')}>
              These apply across the site and the web app, and are saved on this device only.
            </p>
          </div>
          <div className={cx(s.settingsCard, 'col-span-4 md:col-span-6 md:col-start-7')}>
            <DisplaySettings />
          </div>
        </div>
      </Section>

      <Section id="support" className={cx(s.section, s.sectionTight, s.sheet)}>
        <div className={cx(s.frame, s.grid, 'gap-y-6')}>
          <div className="col-span-4 md:col-span-5">
            <Eyebrow>Support</Eyebrow>
            <h2 id="support-title" className={cx(s.h2, 'mt-6')}>
              Found a barrier?
            </h2>
          </div>
          <p className={cx(s.lead, 'col-span-4 md:col-span-6 md:col-start-7')}>
            Tell us what you tried, with which screen reader or browser, and what happened. Write to{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className={s.link}>
              {CONTACT_EMAIL}
            </a>
            . We reply from the same address.
          </p>
        </div>
      </Section>
    </MarketingPage>
  )
}
