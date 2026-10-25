import type { FixtureT } from '@/engine/schemas'
import { formatPct } from '@/lib/format'
import { FORUM_QUOTE } from '../content'
import s from '../landing.module.css'
import { Caption, Eyebrow, PhotoFigure, Section } from '../parts'
import { cx } from '../cx'
import { PHOTOS } from '../photos'
import { fixtureConfig } from '../workedExample'

/** A surface-2 band, 7:5: the forum quote against the meter whose display was solved long ago. */
export function Problem({ fixture }: { fixture: FixtureT | null }) {
  const c = fixture ? fixtureConfig(fixture) : null
  return (
    <Section id="problem" className={cx(s.section, s.band)}>
      <div className={cx(s.frame, s.grid, 'w-full items-center gap-y-12')}>
        <div className="col-span-4 md:col-span-7">
          <Eyebrow>The problem</Eyebrow>
          <h2 id="problem-title" className={cx(s.h2, 'mt-6')}>
            The display was solved. The probe was never solved.
          </h2>
          <figure className="mt-10 border-l-2 border-text pl-6">
            <blockquote className={s.forumQuote}>&ldquo;{FORUM_QUOTE.text}.&rdquo;</blockquote>
            <figcaption className={cx(s.body, 'mt-3 text-text-2')}>{FORUM_QUOTE.source}</figcaption>
          </figure>
          <p className={cx(s.lead, 'mt-10')}>
            Talking multimeters read the number aloud. Nothing tells a blind technician which row
            the probe actually touched, and every published diagnosis method assumes it touched the
            one you asked for.
          </p>
          <p className={cx(s.body, 'mt-6')}>
            A sighted person settles a doubtful reading by looking at the probe. A blind technician
            cannot, so a wrong number and a wrong row sound exactly the same.
          </p>
        </div>
        <div className="col-span-4 md:col-span-5">
          <PhotoFigure photo={PHOTOS.multimeter} sizes="(min-width: 768px) 40vw, 100vw" />
          <Caption className="mt-8">
            The hand model we assume until real hands are measured:
            {c && c.pSame !== null && c.pPm1 !== null && c.pPm2 !== null
              ? ` lands on the told row ${formatPct(c.pSame, 0)} of the time, one row off ${formatPct(c.pPm1, 0)} each side, two rows off ${formatPct(c.pPm2, 0)}. These are assumptions until we measure real hands with the Louisiana Center for the Blind.`
              : ' where the probe lands is uncertain by up to two rows either side.'}
          </Caption>
        </div>
      </div>
    </Section>
  )
}
