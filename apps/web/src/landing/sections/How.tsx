import type { FixtureT } from '@/engine/schemas'
import { useLanding } from '@/state/landing'
import { poseAt } from '../choreography'
import s from '../landing.module.css'
import { Caption, Eyebrow, PhotoFigure, Section } from '../parts'
import { PHOTOS } from '../photos'
import { cx } from '../cx'
import { countWord } from '../numberWords'
import { fixtureConfig, unresolvedGroups, type FixtureConfig } from '../workedExample'

interface MathLine {
  formula: string
  gloss: string
}

function fmt(value: number | null, fallback: string): string {
  return value === null ? fallback : String(value)
}

/** The six lines from .claude/rules/00-truehand.md, with the fixture's own parameters filled in. */
function mathLines(c: FixtureConfig | null): MathLine[] {
  const pSame = fmt(c?.pSame ?? null, 'p_same')
  const pPm1 = fmt(c?.pPm1 ?? null, 'p_1')
  const pPm2 = fmt(c?.pPm2 ?? null, 'p_2')
  const sigma = fmt(c?.sigma ?? null, 'σ')
  const threshold = fmt(c?.warningThreshold ?? null, 'threshold')
  return [
    {
      formula: `P(l | n) = ${pSame} same row, ${pPm1} one row off, ${pPm2} two rows off`,
      gloss:
        'Told row n, the hand lands on row l. These numbers are assumed until we measure real hands.',
    },
    {
      formula: `P(r | f, n) = Σ_l P(l | n) · Normal(r; V_f(l), ${sigma} V)`,
      gloss:
        'How likely a reading is under each fault, averaged over every row the hand may have touched.',
    },
    {
      formula: 'b′(f) ∝ b(f) · P(r | f, n)',
      gloss: "Bayes' rule: every reading reweights every fault.",
    },
    {
      formula: 'n* = argmax_n [ H(b) − E_r H(b′ | r) ]',
      gloss: 'Ask for the row whose reading should remove the most uncertainty.',
    },
    {
      formula: `P(l ≠ n | r) > ${threshold}  →  warn`,
      gloss:
        'When the reading says the probe was probably elsewhere, say: your probe is not where you think it is.',
    },
    {
      formula: 'V_f(l) = V_g(l) for every row l  →  unresolved',
      gloss:
        'When two faults read the same at every row, report both and ask for another measurement.',
    },
  ]
}

interface HowProps {
  fixture: FixtureT | null
  reduced: boolean
}

export function How({ fixture, reduced }: HowProps) {
  const lit = useLanding((st) => poseAt(st.progress).mathLine)
  const lines = mathLines(fixture ? fixtureConfig(fixture) : null)
  const group = fixture ? unresolvedGroups(fixture)[0] : undefined
  return (
    <Section id="how">
      <div data-sticky-track className={cx(s.track, s.trackHow)}>
        <div data-sticky-pin className={s.pin}>
          <div className={cx(s.frame, s.grid, 'w-full items-center gap-y-8 py-16 md:py-12')}>
            <PhotoFigure
              photo={PHOTOS.brailleRows}
              sizes="(min-width: 768px) 16vw, 40vw"
              className={cx(s.ratioStrip, 'hidden md:col-span-2 md:block')}
            />
            <div className={cx('col-span-4 md:col-span-6', s.phonePaper)}>
              <Eyebrow>The method</Eyebrow>
              <h2 id="how-title" className={cx(s.h2, 'mt-4')}>
                {countWord(lines.length, true)} lines of math, not a black box.
              </h2>
              <ol className={cx(s.math, 'mt-6')} aria-label="The six lines">
                {lines.map((line, i) => {
                  const isLit = !reduced && i === lit
                  const isPast = reduced || lit === -1 || i < lit
                  return (
                    <li
                      key={line.formula}
                      className={cx(s.mathLine, isLit && s.mathLineLit, isPast && s.mathLinePast)}
                      aria-current={isLit ? 'step' : undefined}
                    >
                      <p className={s.formula}>{line.formula}</p>
                      <p className={s.gloss}>{line.gloss}</p>
                    </li>
                  )
                })}
              </ol>
              <Caption className="mt-6">
                Scene: three models, one update. The circuit says what each row should read, the
                hand model says where the probe may be, the belief combines them.
              </Caption>
            </div>
          </div>
        </div>
      </div>
      {group && <Refusal labels={group.map((h) => h.label)} />}
    </Section>
  )
}

/** Signature moment 8: two faults the physics cannot separate, held together by a bracket. */
function Refusal({ labels }: { labels: string[] }) {
  return (
    <div className={cx(s.section, s.sheet, s.ruleTop)}>
      <div className={cx(s.frame, s.grid, 'gap-y-8')}>
        <div className="col-span-4 md:col-span-6">
          <h3 className={s.h3}>Refusal is a feature</h3>
          <p className={cx(s.body, 'mt-4')}>
            When two faults produce the same voltages at every row, Truehand says it cannot tell
            them apart and asks for a different measurement. It does not pick one.
          </p>
        </div>
        <figure className="col-span-4 md:col-span-5 md:col-start-8">
          <div className={s.refusal}>
            <ul className={s.bars}>
              {labels.map((label) => (
                <li key={label}>
                  <div className={s.barLabel}>
                    <span>{label}</span>
                    <span className={s.mono}>equal</span>
                  </div>
                  <div className={s.barTrack} aria-hidden="true">
                    <div
                      className={cx(s.barFill, s.barTruehand)}
                      style={{ transform: `scaleX(${1 / labels.length})` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3">
              <span className={s.bracket} aria-hidden="true" />
              <span className="text-lg font-semibold">Unresolved</span>
            </div>
          </div>
          <figcaption className="mt-4">
            <Caption>
              Unresolved. {countWord(labels.length, true)} faults, “{labels.join('” and “')}”, give
              the same voltages at every row. Truehand asks for a different measurement instead of
              guessing.
            </Caption>
          </figcaption>
        </figure>
      </div>
    </div>
  )
}
