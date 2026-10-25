import type { FixtureT } from '@/engine/schemas'
import { monthLabel } from './content'
import { Caption } from './parts'
import { provenance } from './workedExample'

interface ProvenanceLineProps {
  fixture: FixtureT
  className?: string | undefined
}

/**
 * Short public label under our own recorded numbers (POSITIONING section 3): what it is and when.
 * The command, commit and seed stay in the fixture and in docs/EVIDENCE.md, never on the page.
 */
export function ProvenanceLine({ fixture, className }: ProvenanceLineProps) {
  const p = provenance(fixture)
  if (!p) return null
  return (
    <Caption className={className}>Recorded run, simulated hand, {monthLabel(p.date)}.</Caption>
  )
}
