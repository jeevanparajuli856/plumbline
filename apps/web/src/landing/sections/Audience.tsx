import ladderMd from '@docs/brief/Truehand_Scale_and_Build.md?raw'
import s from '../landing.module.css'
import { stripEditorNotes, tableUnder, withRolesForNames } from '../markdownTables'
import { Eyebrow, Inline, Section } from '../parts'
import { cx } from '../cx'

const LADDER = tableUnder(ladderMd, 'Scale ladder')
/** Each rung shows who uses it; buyers have their own section on The app. */
const USER_COLUMN = 'User'

/** Who it is for, from the scale ladder, as ruled rows. Roles, never names. */
export function Audience() {
  const userColumn = Math.max(1, LADDER?.headers.indexOf(USER_COLUMN) ?? 1)
  return (
    <Section id="audience" className={cx(s.section, s.sectionTight, s.sheet)}>
      <div className={cx(s.frame, s.grid, 'gap-y-10')}>
        <header className="col-span-4 md:col-span-4">
          <Eyebrow>Who it is for</Eyebrow>
          <h2 id="audience-title" className={cx(s.h2, 'mt-6')}>
            Built for blind technicians. Bought by the people who equip them.
          </h2>
        </header>
        {LADDER && (
          <ol className={cx(s.outcomes, 'col-span-4 md:col-span-8')} aria-label="Who uses Truehand">
            {LADDER.rows.map((row, i) => (
              <li key={row[0]} className={cx(s.outcome, i === 0 && s.outcomeNow)}>
                <h3 className={s.rungTitle}>
                  <Inline text={withRolesForNames(stripEditorNotes(row[0] ?? ''))} />
                </h3>
                <p className={s.body}>
                  <Inline text={withRolesForNames(stripEditorNotes(row[userColumn] ?? ''))} />
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Section>
  )
}
