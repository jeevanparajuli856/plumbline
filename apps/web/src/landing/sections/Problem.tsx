import type { FixtureT } from '@/engine/schemas'
import { formatPct } from '@/lib/format'
import { FORUM_QUOTE } from '../content'
import s from '../landing.module.css'
import { Caption, Eyebrow, Section } from '../parts'
import { cx } from '../cx'
import { fixtureConfig, siteLabel } from '../workedExample'

export function Problem({ fixture }: { fixture: FixtureT | null }) {
  const c = fixture ? fixtureConfig(fixture) : null
  const told = fixture ? siteLabel(fixture, fixture.prior_instruction.site) : null
  return (
    <Section id="problem" className={cx(s.section, s.tall)}>
      <div className={cx(s.frame, s.grid, 'w-full gap-y-10')}>
        <div className={cx('col-span-4 md:col-span-7', s.phonePaper)}>
          <Eyebrow>The problem</Eyebrow>
          <h2 id="problem-title" className={cx(s.h2, 'mt-6')}>
            The display was solved. The probe was never solved.
          </h2>
          <p className={cx(s.lead, 'mt-6')}>
            Talking multimeters read the number aloud. Nothing tells a blind technician which row
            the probe actually touched, and every published diagnosis method assumes it touched the
            one you asked for.
          </p>
          <figure className="mt-10 border-l-2 border-text pl-6">
            <blockquote className={s.h3}>&ldquo;{FORUM_QUOTE.text}.&rdquo;</blockquote>
            <figcaption className={cx(s.body, 'mt-2 text-text-2')}>{FORUM_QUOTE.source}</figcaption>
          </figure>
          <p className={cx(s.body, 'mt-8')}>
            A sighted person settles a doubtful reading by looking at the probe. A blind technician
            cannot, so a wrong number and a wrong row sound exactly the same.
          </p>
          <Caption className="mt-10">
            Scene: the probe hovers over {told ?? 'the instructed row'}.
            {c && c.pSame !== null && c.pPm1 !== null && c.pPm2 !== null
              ? ` Assumed hand model: lands on the told row ${formatPct(c.pSame, 0)} of the time, one row off ${formatPct(c.pPm1, 0)} each side, two rows off ${formatPct(c.pPm2, 0)}. These are assumptions until we measure real hands with the Louisiana Center for the Blind.`
              : ' Where it lands is uncertain by up to two rows either side.'}
          </Caption>
        </div>
      </div>
    </Section>
  )
}
