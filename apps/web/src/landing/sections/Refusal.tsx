import type { FixtureT } from '@/engine/schemas'
import { HOW_IT_WORKS_SCENE_KEYS } from '../choreography'
import s from '../landing.module.css'
import { Caption, Eyebrow, Section } from '../parts'
import { cx } from '../cx'
import { countWord } from '../numberWords'
import { unresolvedGroups } from '../workedExample'

/** Refusal is a feature: two faults that read the same everywhere, held together by a bracket. */
export function Refusal({ fixture }: { fixture: FixtureT | null }) {
  const labels = fixture ? (unresolvedGroups(fixture)[0]?.map((h) => h.label) ?? []) : []
  return (
    <Section
      id="refusal"
      sceneKey={HOW_IT_WORKS_SCENE_KEYS.refusal}
      className={cx(s.section, s.sceneSection)}
    >
      <div className={cx(s.frame, s.grid, 'gap-y-10')}>
        <div className={cx('col-span-4 md:col-span-6', s.phonePaper)}>
          <Eyebrow>When it cannot tell</Eyebrow>
          <h2 id="refusal-title" className={cx(s.h2, 'mt-6')}>
            It refuses to guess.
          </h2>
          <p className={cx(s.lead, 'mt-6')}>
            Some faults look identical from every row you can reach. When that happens, Truehand
            names both, says it cannot tell them apart, and asks for a different measurement. It
            never picks one to sound sure.
          </p>
          {labels.length > 1 && (
            <figure className={cx(s.refusalCard, 'mt-10')}>
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
                  Unresolved. {countWord(labels.length, true)} faults, &ldquo;
                  {labels.join('” and “')}&rdquo;, read the same at every row. Truehand asks for a
                  different measurement instead of guessing.
                </Caption>
              </figcaption>
            </figure>
          )}
        </div>
      </div>
    </Section>
  )
}
