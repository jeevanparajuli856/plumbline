export type BadgeKind = 'SIMULATED' | 'PROVISIONAL' | 'PENDING' | 'IN PROGRESS' | 'DONE'

// Dashed means "not real yet" (simulated, pending); solid means the condition is a fact.
const LOOK: Record<BadgeKind, string> = {
  SIMULATED: 'border-dashed border-inferred text-inferred',
  PROVISIONAL: 'border-measured text-measured',
  PENDING: 'border-dashed border-border-strong text-text-2',
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
      className={`inline-flex items-baseline gap-1.5 whitespace-nowrap rounded-hard border-[1.5px] px-2 py-0.5 font-mono text-caption font-semibold uppercase tracking-[var(--tracking-caps)] ${LOOK[kind]}`}
    >
      {qualifier ? (
        <span className="font-normal normal-case tracking-normal">{qualifier} </span>
      ) : null}
      {kind}
    </span>
  )
}
