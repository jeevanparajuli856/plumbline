import { STEPS } from '../content'
import { cx } from '../cx'
import s from '../landing.module.css'
import { Eyebrow, Section } from '../parts'
import st from '../steps.module.css'
import { stepsCaption, stepsRun, type StepsRun } from '../stepsRun'
import { useFixture } from '../useFixture'
import { WORKED_EXAMPLE_ID } from '../useWorkedReplay'

interface StepsProps {
  id?: string
}

/**
 * How a run goes, in four cards with a small drawn screen each (the way product pages explain a
 * flow). The drawings are pictures; each card's sentence and the caption below carry the words.
 */
export function Steps({ id = 'steps' }: StepsProps) {
  const load = useFixture(WORKED_EXAMPLE_ID)
  const run = load.status === 'ready' ? stepsRun(load.fixture) : null
  return (
    <Section id={id} className={cx(s.section, s.sectionTight, s.sheet)}>
      <div className={cx(s.frame, 'w-full')}>
        <div className={st.head}>
          <Eyebrow>How it works</Eyebrow>
          <h2 id={`${id}-title`} className={cx(s.h2, 'mt-6')}>
            You hold the probe. Truehand does the checking.
          </h2>
        </div>
        <ol data-motion="reveal" data-motion-reveal="stagger" className={st.list}>
          {STEPS.map((step, i) => (
            <li key={step.name} data-motion-item className={st.card}>
              <div className={st.screen} aria-hidden="true">
                <StepScreen index={i} run={run} />
              </div>
              <div className={st.text}>
                <span className={st.num} aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className={st.title}>
                  <span className="sr-only">Step {i + 1}. </span>
                  {step.name}
                </h3>
                <p className={st.sentence}>{step.sentence}</p>
              </div>
            </li>
          ))}
        </ol>
        {run ? (
          <p data-testid="caption" className={cx(s.caption, 'mt-8')}>
            {stepsCaption(run)}
          </p>
        ) : null}
      </div>
    </Section>
  )
}

function StepScreen({ index, run }: { index: number; run: StepsRun | null }) {
  if (index === 0) return <SpeakScreen text={run?.instruction ?? null} />
  if (index === 1) return <ReadingScreen reading={run?.reading ?? null} />
  if (index === 2) return <RowsScreen run={run} />
  return <ResultScreen run={run} />
}

function SpeakScreen({ text }: { text: string | null }) {
  return (
    <div className={st.speak}>
      <div className={st.speakTop}>
        <svg viewBox="0 0 24 24" width="18" height="18" className={st.speakIcon}>
          <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4Z" fill="currentColor" />
          <path
            d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        <span className={st.bars}>
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>
      <p className={st.bubble}>{text ?? <span className={st.skeleton} />}</p>
    </div>
  )
}

function ReadingScreen({ reading }: { reading: string | null }) {
  return (
    <div className={st.reading}>
      <span className={st.mic}>
        <svg viewBox="0 0 24 24" width="22" height="22">
          <rect x="9" y="3.5" width="6" height="11" rx="3" fill="currentColor" />
          <path
            d="M6 11.5a6 6 0 0 0 12 0M12 17.5V20.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className={st.readingValue}>{reading ?? <span className={st.skeleton} />}</span>
      <span className={st.readingHint}>heard</span>
    </div>
  )
}

function RowsScreen({ run }: { run: StepsRun | null }) {
  const count = run?.siteCount ?? 6
  return (
    <div className={st.rows}>
      <div className={st.holes}>
        {Array.from({ length: count }, (_, i) => {
          const told = run?.told === i
          const likely = run?.likely === i
          return (
            <span key={i} className={st.holeCol}>
              <span
                className={cx(st.hole, told && st.holeTold, likely && st.holeLikely)}
                data-told={told || undefined}
                data-likely={likely || undefined}
              />
              <span className={st.holeLabel}>{i + 1}</span>
            </span>
          )
        })}
      </div>
      <p className={st.slip}>
        {run?.likelyLabel ? (
          <>
            <WarnDot /> Probe slipped. Most likely {run.likelyLabel}.
          </>
        ) : (
          <span className={st.skeleton} />
        )}
      </p>
    </div>
  )
}

function ResultScreen({ run }: { run: StepsRun | null }) {
  const d = run?.diagnosis ?? null
  return (
    <div className={st.result}>
      <div className={st.resultRow}>
        <span className={st.check}>
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path
              d="m6 12.5 4 4 8-9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className={st.resultLabel}>{d ? d.label : <span className={st.skeleton} />}</span>
        <span className={st.resultPct}>{d?.pct}</span>
      </div>
      <span className={st.track}>
        <span className={st.fill} style={{ width: `${Math.round((d?.p ?? 0) * 100)}%` }} />
      </span>
      <p className={st.resultAlt}>Two faults that read the same? It asks for another reading.</p>
    </div>
  )
}

function WarnDot() {
  return <span className={st.warnDot} />
}
