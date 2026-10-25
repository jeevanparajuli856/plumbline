import { DIFFERENCE, PRIOR_ART, STUDIES, TOTAL_PARTICIPANTS } from '../content'
import s from '../landing.module.css'
import { Caption, Eyebrow, PhotoFigure, Section } from '../parts'
import { cx } from '../cx'
import { countWord } from '../numberWords'
import { PHOTOS } from '../photos'

/** 2:3. The left column pins while the three studies scroll past as an offset numbered list. */
export function Research() {
  return (
    <Section id="research" className={cx(s.section, s.sheet, s.ruleTop)}>
      <div className={cx(s.frame, s.grid, 'gap-y-16')}>
        {/* Own row, so the pinned column stops before the prior-art table. */}
        <div className={cx(s.grid, 'col-span-4 gap-y-12 md:col-span-12')}>
          <div className={cx('col-span-4 md:col-span-5', s.pinned)}>
            <Eyebrow>The research</Eyebrow>
            <h2 id="research-title" className={cx(s.h2, 'mt-6')}>
              In {countWord(STUDIES.length)} studies with {TOTAL_PARTICIPANTS} blind participants,
              AI tools added work: people had to check the answers.
            </h2>
            <p className={cx(s.body, 'mt-6 text-text-2')}>
              Two of the studies are peer reviewed and one is a preprint. Across all three, the
              burden that remains is verification: knowing whether an answer can be trusted.
            </p>
            <p className={cx(s.difference, 'mt-8')}>{DIFFERENCE}</p>
            <PhotoFigure
              photo={PHOTOS.brailleDisplay}
              sizes="(min-width: 768px) 40vw, 100vw"
              className={cx(s.ratioWide, 'mt-8 max-w-[26rem]')}
            />
          </div>

          <ol className={cx(s.studies, 'col-span-4 md:col-span-7')} aria-label="Studies">
            {STUDIES.map((study) => (
              <li key={study.id} className={s.study}>
                <div>
                  <p className={s.studyMeta}>
                    <span className={s.studyVenue}>{study.venue}</span>, {study.institution}
                    <br />
                    {study.title}, {study.participantPhrase}
                  </p>
                  <figure className="m-0">
                    <blockquote data-motion="quote" className={s.quote}>
                      &ldquo;{study.quote}&rdquo;
                    </blockquote>
                    <figcaption className={s.speaker}>{study.speaker}</figcaption>
                  </figure>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="col-span-4 md:col-span-12">
          <h3 className={s.h3}>What we build on</h3>
          <p className={cx(s.body, 'mt-3 text-text-2')}>
            We did not invent information-gain test selection. These are the nearest relatives,
            named before any claim of ours.
          </p>
          <div className={cx(s.tableScroll, 'mt-6')}>
            <table className={s.table}>
              <caption className="sr-only">Nearest prior art and what each assumes</caption>
              <thead>
                <tr>
                  <th scope="col">Work</th>
                  <th scope="col">What it does</th>
                  <th scope="col">What it assumes</th>
                </tr>
              </thead>
              <tbody>
                {PRIOR_ART.map((p) => (
                  <tr key={p.name}>
                    <th scope="row" className="w-[28%] font-bold">
                      {p.name}
                    </th>
                    <td>{p.what}</td>
                    <td>{p.gap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Caption className="mt-8">
            Citations as given in our evidence file. DOIs are added once verified; none is invented
            here.
          </Caption>
        </div>
      </div>
    </Section>
  )
}
