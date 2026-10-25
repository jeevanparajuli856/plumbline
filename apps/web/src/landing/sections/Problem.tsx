import { FORUM_QUOTE } from '../content'
import s from '../landing.module.css'
import { Eyebrow, PhotoFigure, Section } from '../parts'
import { cx } from '../cx'
import { PHOTOS } from '../photos'

/** A surface-2 band, 7:5: the hand, not the meter, is the unsolved problem. */
export function Problem() {
  return (
    <Section id="problem" className={cx(s.section, s.sectionTight, s.band)}>
      <div className={cx(s.frame, s.grid, 'w-full items-center gap-y-10')}>
        <div className="col-span-4 md:col-span-7">
          <Eyebrow>The problem</Eyebrow>
          <h2 id="problem-title" className={cx(s.h2, 'mt-6')}>
            The display was solved. The probe was never solved.
          </h2>
          <figure className="mt-8 border-l-2 border-text pl-6">
            <blockquote className={s.forumQuote}>&ldquo;{FORUM_QUOTE.text}.&rdquo;</blockquote>
            <figcaption className={cx(s.body, 'mt-3 text-text-2')}>{FORUM_QUOTE.source}</figcaption>
          </figure>
          <p className={cx(s.lead, 'mt-8')}>
            Talking meters read the number aloud. Nothing tells a blind technician which row the
            probe actually touched, so a wrong number and a wrong row sound exactly the same.
          </p>
        </div>
        <div className="col-span-4 md:col-span-5">
          <PhotoFigure photo={PHOTOS.multimeter} sizes="(min-width: 768px) 40vw, 100vw" />
        </div>
      </div>
    </Section>
  )
}
