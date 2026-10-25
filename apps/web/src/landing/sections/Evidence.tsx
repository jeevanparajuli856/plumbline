import { Link } from 'react-router'
import evidenceMd from '@docs/EVIDENCE.md?raw'
import type { FixtureT } from '@/engine/schemas'
import {
  KILL_RESULT,
  PHASES,
  SIMULATION_SCOPE,
  STATUS_LINE,
  TEAM,
  UNIVERSITY,
  VALIDATION_STATS,
  type PhaseState,
} from '../content'
import s from '../landing.module.css'
import { tableUnder, withoutBriefExpectations } from '../markdownTables'
import { Caption, Eyebrow, Inline, ScrollRegion, Section, StatusBadge } from '../parts'
import { cx } from '../cx'
import { countWord } from '../numberWords'
import { fixtureConfig } from '../workedExample'
import { StatGrid } from './StatGrid'

const READINESS = tableUnder(evidenceMd, '1. Readiness')

const PHASE_CLASS: Record<PhaseState, string> = {
  done: s.phaseDone!,
  'in-progress': s.phaseInProgress!,
  now: s.phaseNow!,
  next: s.phaseNext!,
}
const PHASE_WORD: Record<PhaseState, string> = {
  done: 'done',
  'in-progress': 'in progress',
  now: 'now',
  next: 'next',
}

export function Evidence({ fixture }: { fixture: FixtureT | null }) {
  const c = fixture ? fixtureConfig(fixture) : null
  const assumed =
    c && c.pSame !== null && c.pPm1 !== null && c.pPm2 !== null ? [c.pSame, c.pPm1, c.pPm2] : null
  return (
    <Section id="evidence" className={cx(s.section, s.sheet, s.ruleTop)}>
      <div className={cx(s.frame, s.grid, 'gap-y-12')}>
        <header className="col-span-4 md:col-span-12 lg:col-span-5">
          <Eyebrow>Validation status</Eyebrow>
          <h2 id="evidence-title" className={cx(s.h2, 'mt-6')}>
            {STATUS_LINE}
          </h2>
          <p className={cx(s.lead, 'mt-6')}>{SIMULATION_SCOPE}</p>
          {assumed && (
            <p className={cx(s.body, 'mt-4')}>
              The hand model uses {countWord(assumed.length)} assumed numbers:{' '}
              <span className={s.mono}>{assumed.join(', ')}</span>. They will be replaced by a
              measured matrix, and every experiment re-run.
            </p>
          )}
          <p className={cx(s.body, 'mt-4')}>
            The one result that would end this project: {KILL_RESULT}
          </p>
        </header>

        <div className="col-span-4 md:col-span-12 lg:col-span-7">
          <StatGrid stats={VALIDATION_STATS} />
        </div>

        <div className="col-span-4 md:col-span-12">
          <h3 className={s.h3}>Roadmap</h3>
          <ol className={cx(s.phases, 'mt-6')} aria-label="Phases">
            {PHASES.map((p) => (
              <li
                key={p.name}
                className={cx(s.phase, PHASE_CLASS[p.state])}
                aria-current={p.state === 'now' ? 'step' : undefined}
              >
                <span className="font-semibold">{p.name}</span>
                <span className={cx(s.mono, 'text-base')}>
                  {PHASE_WORD[p.state]}, {p.when}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {READINESS && (
          <div className="col-span-4 md:col-span-12">
            <h3 className={s.h3}>Readiness</h3>
            <ScrollRegion label="Readiness table" className="mt-6">
              <table className={cx(s.table, 'min-w-[860px]')}>
                <caption className="sr-only">
                  Readiness: each item, its status and its evidence
                </caption>
                <thead>
                  <tr>
                    {READINESS.headers.map((h) => (
                      <th key={h} scope="col">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {READINESS.rows.map(([item = '', status = '', evidence = '']) => (
                    <tr key={item}>
                      <th scope="row" className="w-[34%] font-normal">
                        <Inline text={item} />
                      </th>
                      <td className="w-[16%]">
                        <StatusBadge status={status} />
                      </td>
                      <td className="text-base">
                        <Inline text={withoutBriefExpectations(evidence)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollRegion>
            <p className="mt-6">
              <Link to="/evidence" className={s.link}>
                See the validation page with sources and commands
              </Link>
            </p>
          </div>
        )}

        <div className="col-span-4 md:col-span-12">
          <h3 className={s.h3}>Team</h3>
          <ul className="mt-6 grid gap-6 md:grid-cols-12">
            {TEAM.map((m) => (
              <li key={m.name} className="border-t border-hairline pt-4 md:col-span-4">
                <p className="text-lg font-semibold">{m.name}</p>
                <p className="text-lg text-text-2">{m.role}</p>
              </li>
            ))}
          </ul>
          <Caption className="mt-8">
            Built at {UNIVERSITY}. This table is rendered from our evidence file at build time; a
            row says DONE only when it names a command, a file or a source. Expectations from
            earlier runs are left out until the same command runs here.
          </Caption>
        </div>
      </div>
    </Section>
  )
}
