import { Fragment } from 'react'
import type { FixtureT } from '@/engine/schemas'
import s from './landing.module.css'
import { Caption } from './parts'
import { provenance } from './workedExample'

/** Wraps a command only between words, never after the hyphen inside a flag such as --force. */
function Command({ text }: { text: string }) {
  const words = text.split(' ')
  return (
    <code className={s.code}>
      {words.map((word, i) => (
        <Fragment key={i}>
          {i > 0 && ' '}
          <span className="whitespace-nowrap">{word}</span>
        </Fragment>
      ))}
    </code>
  )
}

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
      Recorded by <Command text={p.command} />
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
