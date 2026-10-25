import {
  FIELD_SESSION,
  KILL_RESULT,
  SAFETY_SCOPE,
  SIMULATION_SCOPE,
  STATUS_LINE,
  STUDIES,
  TOTAL_PARTICIPANTS,
  VALIDATION_STATS,
} from '@/landing/content'
import { cx } from '@/landing/cx'
import s from '@/landing/landing.module.css'
import { MarketingPage } from '@/landing/MarketingPage'
import { countWord } from '@/landing/numberWords'
import { BrailleGridArt } from '@/landing/art/Illustrations'
import { Caption, Eyebrow, Section } from '@/landing/parts'
import { StatGrid } from '@/landing/sections/StatGrid'

/** /evidence: why it matters (research), how far validation has come (results), and its limits (scope). */
export function EvidencePage() {
  return (
    <MarketingPage>
      <Section id="research" className={cx(s.section, s.sheet)}>
        <div className={cx(s.frame, s.grid, 'gap-y-12')}>
          <div className={cx('col-span-4 md:col-span-5', s.pinned)}>
            <Eyebrow>Evidence</Eyebrow>
            <h1 id="research-title" tabIndex={-1} className={cx(s.h2, 'mt-6')}>
              {STATUS_LINE}
            </h1>
            <p className={cx(s.lead, 'mt-6')}>
              In {countWord(STUDIES.length)} recent studies with {TOTAL_PARTICIPANTS} blind
              participants, AI tools added work: people had to check the answers. Truehand is built
              so that the checking is done for you.
            </p>
            <BrailleGridArt className="mt-8 max-w-[28rem]" />
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
      </Section>

      <Section id="results" reveal="up" className={cx(s.section, s.sectionTight, s.band)}>
        <div className={cx(s.frame, s.grid, 'gap-y-10')}>
          <div className="col-span-4 md:col-span-4">
            <Eyebrow>Results</Eyebrow>
            <h2 id="results-title" className={cx(s.h2, 'mt-6')}>
              What the simulation shows
            </h2>
            <p className={cx(s.body, 'mt-6 text-text-2')}>
              Same faults, same readings: Truehand against a conventional assistant that trusts
              every instruction. Each number comes from our own recorded runs, labeled simulated.
              Preliminary. Not peer reviewed.
            </p>
          </div>
          <div className="col-span-4 md:col-span-8">
            <StatGrid stats={VALIDATION_STATS} />
            <Caption className="mt-6">
              Each cell names how many simulated runs it rests on and the month they ran. The cell
              without a number waits on sessions with blind participants.
            </Caption>
          </div>
        </div>
      </Section>

      <Section id="scope" reveal="up" className={cx(s.section, s.sectionTight, s.sheet)}>
        <div className={cx(s.frame, s.grid, 'gap-y-8')}>
          <div className="col-span-4 md:col-span-4">
            <Eyebrow>Scope</Eyebrow>
            <h2 id="scope-title" className={cx(s.h2, 'mt-6')}>
              What we have not measured yet
            </h2>
          </div>
          <div className="col-span-4 grid gap-6 md:col-span-7 md:col-start-6">
            <p className={s.lead}>{SIMULATION_SCOPE}</p>
            <p className={s.fieldSession}>{FIELD_SESSION}</p>
            <p className={s.body}>The result that would change our minds: {KILL_RESULT}</p>
            <p className={cx(s.body, 'text-text-2')}>{SAFETY_SCOPE}</p>
          </div>
        </div>
      </Section>
    </MarketingPage>
  )
}
