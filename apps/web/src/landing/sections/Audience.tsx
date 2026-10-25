import type { CSSProperties } from 'react'
import evidenceMd from '@docs/EVIDENCE.md?raw'
import ladderMd from '@docs/brief/Truehand_Scale_and_Build.md?raw'
import s from '../landing.module.css'
import l from '../ladder.module.css'
import { stripEditorNotes, tableUnder, withRolesForNames } from '../markdownTables'
import { Caption, Eyebrow, Inline, Section } from '../parts'
import { cx } from '../cx'

const LADDER = tableUnder(ladderMd, 'Scale ladder')
const STATS = tableUnder(evidenceMd, '3. Employment')
/** Columns shown per rung: who uses it and who pays. The engine column stays off the site. */
const SHOWN_COLUMNS = ['User', 'Who pays']

/** Who it is for and who buys it, from the scale ladder, as a ruled staircase. Roles, never names. */
export function Audience() {
  const employment = STATS?.rows[0]
  const columns = SHOWN_COLUMNS.map((h) => LADDER?.headers.indexOf(h) ?? -1).filter((i) => i > 0)
  return (
    <Section id="audience" className={cx(s.section, s.sectionTight, s.sheet)}>
      <div className={cx(s.frame, s.grid, 'gap-y-10')}>
        <header className="col-span-4 md:col-span-8">
          <Eyebrow>Who it is for</Eyebrow>
          <h2 id="audience-title" className={cx(s.h2, 'mt-6')}>
            Built for blind technicians. Bought by the people who equip them.
          </h2>
        </header>
        {LADDER && (
          <ol className={cx(l.stairs, 'col-span-4 md:col-span-12')} aria-label="Who uses Truehand">
            {LADDER.rows.map((row, i) => {
              const stage = row[0] ?? ''
              return (
                <li
                  key={stage}
                  className={cx(l.stair, i === 0 && l.stairNow)}
                  style={{ '--rung': i } as CSSProperties}
                >
                  <h3 className={l.stairTitle}>
                    <Inline text={withRolesForNames(stripEditorNotes(stage))} />
                  </h3>
                  <dl className={l.stairFacts}>
                    {columns.map((j) => (
                      <div key={j}>
                        <dt className={s.label}>{LADDER.headers[j]}</dt>
                        <dd>
                          <Inline text={withRolesForNames(stripEditorNotes(row[j] ?? ''))} />
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
          The filled marker is where we start: electronics classrooms and benches.
          {employment && (
            <>
              {' '}
              <Inline text={stripEditorNotes(employment[0] ?? '')} />.
            </>
          )}
        </Caption>
      </div>
    </Section>
  )
}
