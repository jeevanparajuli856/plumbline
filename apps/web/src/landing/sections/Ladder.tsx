import type { CSSProperties } from 'react'
import evidenceMd from '@docs/EVIDENCE.md?raw'
import ladderMd from '@docs/brief/Truehand_Scale_and_Build.md?raw'
import s from '../landing.module.css'
import { stripEditorNotes, tableUnder, withRolesForNames } from '../markdownTables'
import { Caption, Eyebrow, Inline, Section } from '../parts'
import { cx } from '../cx'
import { countWord } from '../numberWords'

const LADDER = tableUnder(ladderMd, 'Scale ladder')
const STATS = tableUnder(evidenceMd, '3. Employment')
/** The trailing parenthetical of the EVIDENCE statistic names its source. */
const SOURCE_IN_PARENS = /\(([^)]*)\)\s*$/

export function Ladder() {
  const employment = STATS?.rows[0]
  const source = SOURCE_IN_PARENS.exec(stripEditorNotes(employment?.[0] ?? ''))?.[1]
  return (
    <Section id="ladder" className={cx(s.section, s.band)}>
      <div className={cx(s.frame, s.grid, 'gap-y-12')}>
        <header className="col-span-4 md:col-span-8">
          <Eyebrow>Who it is for</Eyebrow>
          <h2 id="ladder-title" className={cx(s.h2, 'mt-6')}>
            One engine, {countWord(LADDER?.rows.length ?? 0)} rungs. Electronics is the first
            because its physics is exact.
          </h2>
          {employment && (
            <p className={cx(s.lead, 'mt-6')}>
              <Inline text={stripEditorNotes(employment[0] ?? '')} />.
            </p>
          )}
        </header>
        {LADDER && (
          <ol className={cx(s.stairs, 'col-span-4 md:col-span-12')} aria-label="Scale ladder">
            {LADDER.rows.map((row, i) => {
              const [stage = '', ...facts] = row
              return (
                <li
                  key={stage}
                  className={cx(s.stair, i === 0 && s.stairNow)}
                  style={{ '--rung': i } as CSSProperties}
                >
                  <h3 className={s.stairTitle}>
                    <Inline text={withRolesForNames(stripEditorNotes(stage))} />
                  </h3>
                  <dl className={s.stairFacts}>
                    {facts.map((cell, j) => (
                      <div key={LADDER.headers[j + 1] ?? j}>
                        <dt className={s.label}>{LADDER.headers[j + 1]}</dt>
                        <dd>
                          <Inline text={withRolesForNames(stripEditorNotes(cell))} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </li>
              )
            })}
          </ol>
        )}
        <Caption className="col-span-4 md:col-span-8">
          Each step down the staircase is a larger market on the same engine. The filled marker is
          where we are now.
          {source && ` Employment figure: ${source}.`}
        </Caption>
      </div>
    </Section>
  )
}
