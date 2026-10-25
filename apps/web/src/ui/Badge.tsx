export type BadgeKind = 'SIMULATED' | 'PROVISIONAL' | 'PENDING' | 'IN PROGRESS' | 'DONE'

const LOOK: Record<BadgeKind, string> = {
  SIMULATED: 'border-inferred text-inferred border-dashed',
  PROVISIONAL: 'border-measured text-measured',
  PENDING: 'border-border-strong text-text-2 border-dashed',
  'IN PROGRESS': 'border-inferred text-inferred',
  DONE: 'border-text bg-text text-bench',
}

interface BadgeProps {
  kind: BadgeKind
  /** Extra words read with the badge, e.g. "engine" in "engine PENDING". */
  qualifier?: string
  title?: string
}

/** Honesty badge. Text, not color: the word is always there for screen readers and print. */
export function Badge({ kind, qualifier, title }: BadgeProps) {
  return (
    <span
      data-testid="badge"
      title={title}
      className={`inline-flex items-baseline gap-1.5 whitespace-nowrap rounded-hard border-2 px-2 py-0.5 font-mono text-sm font-semibold uppercase tracking-[var(--tracking-caps)] ${LOOK[kind]}`}
    >
      {qualifier ? (
        <span className="font-normal normal-case tracking-normal">{qualifier} </span>
      ) : null}
      {kind}
    </span>
  )
}
