import { Badge } from '@/ui/Badge'
import type { ValidationStat } from '../content'
import { cx } from '../cx'
import st from '../stats.module.css'

function statText(stat: ValidationStat & { value: number }): string {
  return `${stat.value.toFixed(stat.decimals)}${stat.suffix}`
}

function hasValue(stat: ValidationStat): stat is ValidationStat & { value: number } {
  return stat.value !== null
}

interface StatGridProps {
  stats: readonly ValidationStat[]
}

/**
 * Four ruled cells. Numbers come from docs/results through content.ts; the visible number is the
 * motion hook (counts up once) beside an sr-only twin with the same text. The cell that waits on
 * user validation, and any simulated cell whose run file or row is missing, never animates.
 */
export function StatGrid({ stats }: StatGridProps) {
  return (
    <ul className={st.stats} aria-label="Validation results">
      {stats.map((stat) => {
        if (!stat.isSimulated) {
          return (
            <li key={stat.id} className={cx(st.stat, st.statPending)}>
              <div>
                <Badge kind="PENDING" />
              </div>
              <p className={st.statPendingWord}>Real hands</p>
              <p className="text-base leading-relaxed">{stat.label}</p>
              <p className={st.statSource}>{stat.source}</p>
            </li>
          )
        }
        if (!hasValue(stat)) {
          return (
            <li
              key={stat.id}
              className={cx(st.stat, st.statPending)}
              data-source={stat.path ?? undefined}
            >
              <p className={st.statPendingWord}>Not recorded yet</p>
              <p className="text-base leading-relaxed">{stat.label}</p>
              <p className={st.statSource}>{stat.source}</p>
            </li>
          )
        }
        return (
          <li key={stat.id} className={st.stat}>
            <p className={st.statNumber}>
              <span
                aria-hidden="true"
                data-motion="stat"
                data-motion-value={stat.value}
                data-motion-decimals={stat.decimals}
                data-motion-suffix={stat.suffix || undefined}
              >
                {statText(stat)}
              </span>
              <span className="sr-only">{statText(stat)}</span>
            </p>
            <p className="text-base leading-relaxed">{stat.label}</p>
            <p className={st.statSource}>{stat.source}</p>
          </li>
        )
      })}
    </ul>
  )
}
