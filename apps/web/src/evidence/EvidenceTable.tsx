import { Badge } from '@/ui/Badge'
import { InlineText } from './InlineText'
import { overallStatus, type EvidenceRow } from './markdown'

interface EvidenceTableProps {
  rows: readonly EvidenceRow[]
}

const RULE = {
  DONE: 'border-l-text border-solid',
  SIMULATED: 'border-l-inferred border-dashed',
  'IN PROGRESS': 'border-l-inferred border-solid',
  PENDING: 'border-l-border-strong border-dashed',
} as const

/** The readiness table, row for row from docs/EVIDENCE.md. Nothing is collapsed; unfinished rows are marked by rule and badge. */
export function EvidenceTable({ rows }: EvidenceTableProps) {
  return (
    <div className="overflow-x-auto">
      <table aria-label="Readiness" className="w-full min-w-[44rem] border-collapse text-left">
        <thead>
          <tr className="text-text-2">
            <th scope="col" className="w-[34%] border-b-2 border-text py-2 pl-4 pr-4 font-medium">
              Item
            </th>
            <th scope="col" className="w-[16%] border-b-2 border-text py-2 pr-4 font-medium">
              Status
            </th>
            <th scope="col" className="border-b-2 border-text py-2 font-medium">
              Evidence
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const status = overallStatus(row.statuses)
            return (
              <tr key={i} className="align-top">
                <th
                  scope="row"
                  className={`border-b border-l-4 border-b-hairline py-3 pl-4 pr-4 text-left font-medium ${RULE[status]}`}
                >
                  <InlineText parts={row.item} />
                </th>
                <td className="border-b border-hairline py-3 pr-4">
                  <span className="flex flex-col items-start gap-1.5">
                    {row.statuses.map((s, j) => (
                      <Badge
                        key={j}
                        kind={s.status}
                        {...(s.qualifier ? { qualifier: s.qualifier } : {})}
                      />
                    ))}
                  </span>
                </td>
                <td className="border-b border-hairline py-3 text-text-2">
                  <InlineText parts={row.evidence} />
                  {row.withheld ? (
                    <span className="mt-1 block italic">
                      The brief&apos;s expected figure is withheld until we reproduce it here.
                    </span>
                  ) : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
