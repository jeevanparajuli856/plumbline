import type { FixtureT } from '@/engine/schemas'
import s from './landing.module.css'
import { Caption } from './parts'
import { provenance } from './workedExample'

interface ProvenanceLineProps {
  fixture: FixtureT
  className?: string | undefined
}

/** Static caption under our own numbers: command, short commit, date and seed, then the honesty note. */
export function ProvenanceLine({ fixture, className }: ProvenanceLineProps) {
  const p = provenance(fixture)
  if (!p) return null
  return (
    <Caption className={className}>
      Recorded by <code className={s.code}>{p.command}</code>
      {p.sha && (
        <>
          , commit <code className={s.code}>{p.sha}</code>
        </>
      )}
      {p.date && `, ${p.date}`}
      {p.seed !== null && `, seed ${p.seed}`}. Preliminary. Not peer reviewed.
    </Caption>
  )
}
