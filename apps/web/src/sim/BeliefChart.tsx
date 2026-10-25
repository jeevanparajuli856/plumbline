import { Link } from 'react-router'
import { formatPct } from '@/lib/format'
import type { BaselineState, Catalog } from '@/state/types'
import { baselineName, beliefRows, truehandVerdict, type BeliefRow, type Verdict } from './view'

interface BeliefChartProps {
  belief: readonly number[]
  catalog: Catalog
  baseline: BaselineState | null
  hasReadings: boolean
  /** Labels of the indistinguishable faults when the engine refused; null otherwise. */
  unresolvedLabels?: readonly string[] | null
}

const NAME = 'Belief over faults'

/**
 * Truehand's belief (cyan, outlined) beside the published method (neutral, dashed) on the same
 * readings. The chart is a real table, so the table twin is the chart itself.
 */
export function BeliefChart({
  belief,
  catalog,
  baseline,
  hasReadings,
  unresolvedLabels = null,
}: BeliefChartProps) {
  const rows = beliefRows(belief, catalog)
  const uniform = catalog.hypotheses.length > 0 ? 1 / catalog.hypotheses.length : 0
  const baselineTop = baseline?.diagnosis ?? null
  return (
    <figure aria-label={NAME} className="m-0">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="label-caps">{NAME}</span>
        {!hasReadings ? (
          <span className="text-text-2">
            No reading yet. Every fault starts at{' '}
            <span className="font-mono tnum">{formatPct(uniform, 1)}</span>.
          </span>
        ) : null}
      </figcaption>

      <div className="mt-4 grid gap-px overflow-hidden rounded-hard border-2 border-border-strong bg-border-strong sm:grid-cols-2">
        <VerdictCell
          title="Truehand"
          note="Infers where the probe landed"
          verdict={truehandVerdict(rows, hasReadings, unresolvedLabels)}
          testId="belief-verdict"
          look="inferred"
        />
        <VerdictCell
          title={baselineName(baseline?.method ?? 'entropy_exact')}
          note="Assumes the probe is where it was told"
          verdict={
            baselineTop
              ? { kind: 'top', label: baselineTop.label, p: baselineTop.confidence }
              : { kind: 'waiting' }
          }
          look="baseline"
        />
      </div>

      <table aria-label={NAME} className="mt-5 w-full border-collapse text-left">
        <thead className="sr-only">
          <tr>
            <th scope="col">Fault</th>
            <th scope="col">Probability</th>
          </tr>
        </thead>
        <tbody>
          <GroupHeader title="Truehand" />
          {rows.map((row) => (
            <BarRow key={row.id} row={row} look="inferred" />
          ))}
        </tbody>
        <tbody>
          <GroupHeader title="Published method" />
          {baselineTop ? (
            <BarRow
              row={{
                id: baselineTop.hypothesisId,
                label: baselineTop.label,
                p: baselineTop.confidence,
              }}
              look="baseline"
            />
          ) : (
            <tr>
              <td colSpan={2} className="py-2 text-text-2">
                No reading yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="mt-3 text-text-2">
        Compared with a published method on the same readings.{' '}
        <Link to="/docs#comparison" className="font-semibold text-text underline underline-offset-4">
          About the comparison
        </Link>
      </p>
    </figure>
  )
}

function VerdictCell({
  title,
  note,
  verdict,
  look,
  testId,
}: {
  title: string
  note: string
  verdict: Verdict
  look: 'inferred' | 'baseline'
  /** UI_CONTRACT 6.14: the Truehand verdict line is data-testid="belief-verdict". */
  testId?: string
}) {
  return (
    <div className="bg-surface-1 p-4">
      <p className="flex items-center gap-2 font-semibold">
        <span
          aria-hidden="true"
          className={`inline-block h-3 w-5 rounded-hard border-2 ${look === 'inferred' ? 'border-inferred' : 'border-dashed border-baseline'}`}
        />
        {title}
      </p>
      <p className="text-text-2">{note}</p>
      <p data-testid={testId} className="mt-3 min-h-[3.25rem] text-md">
        {verdict.kind === 'top' ? (
          <>
            <span className="block font-medium">{verdict.label}</span>{' '}
            <span className="font-mono tnum text-lg">{formatPct(verdict.p, 1)}</span>
          </>
        ) : verdict.kind === 'unresolved' ? (
          <span className="block font-medium">{verdict.text}</span>
        ) : (
          <span className="text-text-2">Waiting for a reading.</span>
        )}
      </p>
    </div>
  )
}

function GroupHeader({ title }: { title: string }) {
  return (
    <tr>
      <th colSpan={2} scope="rowgroup" className="pb-1 pt-3 text-left font-semibold">
        {title}
      </th>
    </tr>
  )
}

function BarRow({ row, look }: { row: BeliefRow; look: 'inferred' | 'baseline' }) {
  const outline =
    look === 'inferred' ? 'border-inferred bg-inferred-fill/20' : 'border-dashed border-baseline'
  const leftEdge = look === 'inferred' ? 'border-inferred' : 'border-dashed border-baseline'
  return (
    <tr className="align-middle">
      <th scope="row" className="w-[42%] py-1.5 pr-3 text-left font-normal">
        {row.label}
      </th>
      <td className="py-1.5">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className={`relative h-6 flex-1 overflow-hidden border-l-2 ${leftEdge}`}
          >
            <div
              className={`absolute inset-0 border-2 border-l-0 ${outline} transition-transform duration-[var(--motion-belief-bars)] ease-[var(--ease-smooth)]`}
              style={{ transform: `translateX(${(row.p - 1) * 100}%)` }}
            />
          </div>
          <span className="w-16 text-right font-mono tnum">{formatPct(row.p, 1)}</span>
        </div>
      </td>
    </tr>
  )
}
