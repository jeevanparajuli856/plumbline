import { Link } from 'react-router'
import evidenceMd from '@docs/EVIDENCE.md?raw'
import { InlineText } from '@/evidence/InlineText'
import { parseEvidence, parseInline } from '@/evidence/markdown'
import { CONTACT_EMAIL, SAFETY_SCOPE } from '@/landing/content'
import { cx } from '@/landing/cx'
import s from '@/landing/landing.module.css'
import { MarketingPage } from '@/landing/MarketingPage'
import { Eyebrow, Section } from '@/landing/parts'

const evidence = parseEvidence(evidenceMd)
const CONTACT_PLACE = 'Monroe, Louisiana'

/** The only page that names the founders and the university (ADR-0014). */
const TEAM: readonly { name: string; role: string }[] = [
  { name: 'Jeevan Parajuli', role: 'Product and the Truehand app' },
  { name: 'Pankaj Bhatta', role: 'The original engine and experiments' },
]
const UNIVERSITY = 'University of Louisiana Monroe'

function contactHref(subject: string): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`
}

interface AboutBlockProps {
  id: string
  title: string
  children: React.ReactNode
}

function AboutBlock({ id, title, children }: AboutBlockProps) {
  return (
    <Section
      id={id}
      reveal="up"
      className={cx(s.section, s.sectionTight, s.sheet, s.ruleTop, 'scroll-mt-24')}
    >
      <div className={cx(s.frame, s.grid, 'gap-y-6')}>
        <h2 id={`${id}-title`} className={cx(s.h2, 'col-span-4 md:col-span-4')}>
          {title}
        </h2>
        <div className="col-span-4 grid gap-4 md:col-span-7 md:col-start-6">{children}</div>
      </div>
    </Section>
  )
}

/** /about: who we are, the pilot and partner paths, and the studies we cite. */
export function AboutPage() {
  return (
    <MarketingPage>
      <Section id="team" className={cx(s.section, s.sheet)}>
        <div className={cx(s.frame, s.grid, 'gap-y-10')}>
          <div className="col-span-4 md:col-span-7">
            <Eyebrow>About</Eyebrow>
            <h1 id="about-title" tabIndex={-1} className={cx(s.h2, 'mt-6')}>
              Trustworthy measurement for hands that cannot see the tool.
            </h1>
            <p className={cx(s.lead, 'mt-6')}>
              Truehand tells a blind technician where to probe, warns when the probe landed
              somewhere else, and names the fault only when the readings agree.
            </p>
          </div>
          <div className="col-span-4 border-l-2 border-text pl-6 md:col-span-4 md:col-start-9">
            <h2 id="team-title" className={s.label}>
              Team
            </h2>
            <ul className="mt-3 grid gap-3">
              {TEAM.map((m) => (
                <li key={m.name}>
                  <p className="text-lg font-bold">{m.name}</p>
                  <p className="text-text-2">{m.role}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-text-2">{UNIVERSITY}</p>
          </div>
        </div>
      </Section>

      <AboutBlock id="pilot" title="Join the pilot">
        <p className={s.body}>
          For blindness organizations and instructors who teach electronics. A pilot is a short
          session where students use Truehand and, with permission, help us measure how real hands
          miss a breadboard row.
        </p>
        <p className={s.body}>
          <a className={s.link} href={contactHref('Truehand pilot')}>
            Email us about the pilot
          </a>{' '}
          at {CONTACT_EMAIL}, or use the{' '}
          <Link to="/contact" className={s.link}>
            contact form
          </Link>
          . {CONTACT_PLACE}.
        </p>
      </AboutBlock>

      <AboutBlock id="partner" title="Partner with us">
        <p className={s.body}>
          For instrument makers and rehabilitation agencies. The same engine works for other
          instruments where the probe can land in the wrong place, from lab meters to kitchen
          thermometers.
        </p>
        <p className={s.body}>
          <a className={s.link} href={contactHref('Truehand partnership')}>
            Email us about a partnership
          </a>{' '}
          at {CONTACT_EMAIL}. {CONTACT_PLACE}.
        </p>
      </AboutBlock>

      <AboutBlock id="sources" title="Sources">
        <ol className="grid list-decimal gap-4 pl-6 marker:font-mono marker:text-text-2">
          {evidence.studies.map((study, i) => (
            <li key={i} className="pl-2">
              <InlineText parts={parseInline(study)} />
            </li>
          ))}
        </ol>
        <p className={cx(s.body, 'text-text-2')}>{SAFETY_SCOPE}</p>
      </AboutBlock>
    </MarketingPage>
  )
}
