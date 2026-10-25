import { overallStatus, type Evidence, type StatusKind } from './markdown'

const EXPERIMENT_PREFIX = 'python -m truehand.experiments'

/** Experiment commands named in the table. Their figures appear only once docs/results/ holds a run. */
export function experimentCommands(ev: Evidence): string[] {
  const all = ev.readiness
    .flatMap((r) => r.evidence)
    .flatMap((p) => (p.kind === 'code' ? [p.text] : []))
  return [...new Set(all.filter((c) => c.includes(EXPERIMENT_PREFIX)))]
}

export function statusCounts(ev: Evidence): Record<StatusKind, number> {
  const counts: Record<StatusKind, number> = { DONE: 0, 'IN PROGRESS': 0, PENDING: 0, SIMULATED: 0 }
  for (const row of ev.readiness) counts[overallStatus(row.statuses)] += 1
  return counts
}
