import { DIFFERENCE, PRIOR_ART, STUDIES, TOTAL_PARTICIPANTS } from '../content'
import s from '../landing.module.css'
import { Caption, Eyebrow, Section } from '../parts'
import { cx } from '../cx'
import { countWord } from '../numberWords'

export function Research() {
  const [lead, ...rest] = STUDIES
  return (
    <Section id="research" className={cx(s.section, s.sheet)}>
      <div className={cx(s.frame, s.grid, 'gap-y-12')}>
        <header className="col-span-4 md:col-span-8">
          <Eyebrow>The research</Eyebrow>
          <h2 id="research-title" className={cx(s.h2, 'mt-6')}>
            In {countWord(STUDIES.length)} studies with {TOTAL_PARTICIPANTS} blind participants, AI tools added work:
            people had to check the answers.
          </h2>
          <p className={cx(s.lead, 'mt-6')}>
            Two of the studies are peer reviewed and one is a preprint. Across all three, the burden
            that remains is verification: knowing whether an answer can be trusted.
          </p>
        </header>

        <ol className="col-span-4 grid gap-0 md:col-span-12" aria-label="Studies">
          {lead && (
            <li className="grid gap-6 border-t-2 border-text py-8 md:grid-cols-12">
              <StudyMeta study={lead} />
              <figure className="md:col-span-8 md:col-start-5">
                <blockquote className={cx(s.h3, 'max-w-[28em]')}>
                  &ldquo;{lead.quote}&rdquo;
                </blockquote>
                <figcaption className={cx(s.body, 'mt-3 text-text-2')}>{lead.speaker}</figcaption>
              </figure>
            </li>
          )}
          {rest.map((study) => (
            <li key={study.id} className="grid gap-6 border-t border-hairline py-8 md:grid-cols-12">
              <StudyMeta study={study} />
              <figure className="md:col-span-8 md:col-start-5">
                <blockquote className={s.lead}>&ldquo;{study.quote}&rdquo;</blockquote>
                <figcaption className={cx(s.body, 'mt-3 text-text-2')}>{study.speaker}</figcaption>
              </figure>
            </li>
          ))}
        </ol>

        <div className="col-span-4 md:col-span-12">
          <h3 className={s.h3}>What we build on</h3>
          <p className={cx(s.body, 'mt-3')}>
            We did not invent information-gain test selection. These are the nearest relatives,
            named before any claim of ours.
          </p>
          <table className={cx(s.table, 'mt-6')}>
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
                  <th scope="row" className="font-semibold">
                    {p.name}
                  </th>
                  <td>{p.what}</td>
                  <td>{p.gap}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={cx(s.h3, 'mt-10 max-w-[30em]')}>{DIFFERENCE}</p>
          <Caption className="mt-8">
            Citations as given in our evidence file. DOIs are added once verified; none is invented
            here.
          </Caption>
        </div>
      </div>
    </Section>
  )
}

function StudyMeta({ study }: { study: (typeof STUDIES)[number] }) {
  return (
    <div className="md:col-span-4">
      <p className={cx(s.mono, 'text-base font-semibold')}>{study.venue}</p>
      <p className="mt-1 text-lg">{study.title}</p>
      <p className="text-lg text-text-2">{study.institution}</p>
      <p className={cx(s.mono, 'mt-2 text-base text-text-2')}>{study.participantPhrase}</p>
    </div>
  )
}
