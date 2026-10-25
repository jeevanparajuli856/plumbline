import evidenceMd from '@docs/EVIDENCE.md?raw'
import ladderMd from '@docs/brief/Plumbline_Scale_and_Build.md?raw'
import s from '../landing.module.css'
import { stripEditorNotes, tableUnder, withRolesForNames } from '../markdownTables'
import { Caption, Eyebrow, Inline, ScrollRegion, Section } from '../parts'
import { cx } from '../cx'

const LADDER = tableUnder(ladderMd, 'Scale ladder')
const STATS = tableUnder(evidenceMd, '3. Employment')

export function Ladder() {
  const employment = STATS?.rows[0]
  return (
    <Section id="ladder" className={cx(s.section, s.sheet)}>
      <div className={cx(s.frame, s.grid, 'gap-y-12')}>
        <header className="col-span-4 md:col-span-8">
          <Eyebrow>Who it is for</Eyebrow>
          <h2 id="ladder-title" className={cx(s.h2, 'mt-6')}>
            One engine, four rungs. Electronics is the first because its physics is exact.
          </h2>
          {employment && (
            <p className={cx(s.lead, 'mt-6')}>
              <Inline text={stripEditorNotes(employment[0] ?? '')} />.
            </p>
          )}
        </header>
        {LADDER && (
          <div className="col-span-4 md:col-span-12">
            <ScrollRegion label="Scale ladder table" className={s.rail}>
              <table className={cx(s.table, 'min-w-[720px]')}>
                <caption className="sr-only">
                  Scale ladder: who uses it, what the engine infers, who pays
                </caption>
                <thead>
                  <tr>
                    {LADDER.headers.map((h) => (
                      <th key={h} scope="col">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {LADDER.rows.map((row, i) => (
                    <tr key={row[0]} className={cx(s.rung, i === 0 && s.rungNow)}>
                      {row.map((cell, j) =>
                        j === 0 ? (
                          <th key={j} scope="row" className="relative font-semibold">
                            <Inline text={withRolesForNames(stripEditorNotes(cell))} />
                          </th>
                        ) : (
                          <td key={j}>
                            <Inline text={withRolesForNames(stripEditorNotes(cell))} />
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollRegion>
          </div>
        )}
        <Caption className="col-span-4 md:col-span-8">
          Scene: the plumb line becomes this rail. The filled rung is where we are now. Employment
          figure: 2023 American Community Survey, analyzed by NRTC at Mississippi State.
        </Caption>
      </div>
    </Section>
  )
}
