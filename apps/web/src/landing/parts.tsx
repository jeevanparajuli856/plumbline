import type { ReactNode } from 'react'
import type { LandingSection } from '@/state/landing'
import s from './landing.module.css'
import { cx } from './cx'
import { Badge, type BadgeKind } from '@/ui/Badge'
import { inlineSegments, statusTone, type StatusTone } from './markdownTables'

interface SectionProps {
  id: string
  className?: string | undefined
  /** A motion hook on the section itself (UI_CONTRACT 5.3), e.g. "bars" on section#play. */
  motion?: string | undefined
  /** Scroll key for the scene's progress (How it works only; see HOW_IT_WORKS_SCENE_KEYS). */
  sceneKey?: LandingSection | undefined
  /** Enter reveal (UI_CONTRACT 5.3); ignored when the section carries another motion hook. */
  reveal?: 'up' | 'mask' | 'stagger' | undefined
  children: ReactNode
}

/** Every marketing section: a labelled landmark. Heading id is `${id}-title`. */
export function Section({ id, className, motion, sceneKey, reveal, children }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      data-landing-section={sceneKey}
      data-motion={motion ?? (reveal ? 'reveal' : undefined)}
      data-motion-reveal={motion ? undefined : reveal}
      className={className}
    >
      {children}
    </section>
  )
}

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode
  className?: string | undefined
}) {
  return <p className={cx(s.eyebrow, className)}>{children}</p>
}

/**
 * The static DOM twin of a scene or drawing: read by screen readers, not shown (sighted readers
 * have the picture; Docs explains it). Never a live region. `visible` prints it as a caption.
 */
export function Caption({
  children,
  className,
  visible = false,
}: {
  children: ReactNode
  className?: string | undefined
  visible?: boolean
}) {
  return (
    <p data-testid="caption" className={visible ? cx(s.caption, className) : 'sr-only'}>
      {children}
    </p>
  )
}

const TONE_KIND: Record<StatusTone, BadgeKind> = {
  done: 'DONE',
  progress: 'IN PROGRESS',
  pending: 'PENDING',
  simulated: 'SIMULATED',
}

/**
 * Evidence status from docs/EVIDENCE.md as the shared honesty badge. A mixed status such as
 * "scratch DONE, engine PENDING" keeps its leading words as the badge qualifier.
 */
export function StatusBadge({ status }: { status: string }) {
  const kind = TONE_KIND[statusTone(status)]
  const upper = status.trim().toUpperCase()
  const qualifier = upper.endsWith(kind) ? status.trim().slice(0, -kind.length).trim() : ''
  return qualifier ? <Badge kind={kind} qualifier={qualifier} /> : <Badge kind={kind} />
}

/** The warning glyph, drawn: a triangle with a bar and a dot. Decorative; the word carries it. */
export function WarningGlyph({ className }: { className?: string | undefined }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" focusable="false">
      <path
        d="M10 2.5 18.5 17.5H1.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 8v4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="14.9" r="1.1" fill="currentColor" />
    </svg>
  )
}

/** Renders markdown inline segments as React nodes: code, bold and links. No HTML strings. */
export function Inline({ text }: { text: string }) {
  return (
    <>
      {inlineSegments(text).map((seg, i) => {
        if (seg.kind === 'code')
          return (
            <code key={i} className={s.code}>
              {seg.text}
            </code>
          )
        if (seg.kind === 'strong') return <strong key={i}>{seg.text}</strong>
        if (seg.kind === 'link')
          return (
            <a key={i} href={seg.href} className={s.link} rel="noreferrer">
              {seg.text}
            </a>
          )
        return <span key={i}>{seg.text}</span>
      })}
    </>
  )
}

interface ScrollRegionProps {
  label: string
  className?: string | undefined
  children: ReactNode
}

/** A horizontally scrollable table wrapper. Focusable so keyboard users can scroll it (WCAG 2.1.1). */
export function ScrollRegion({ label, className, children }: ScrollRegionProps) {
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div className={cx(s.tableScroll, className)} role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  )
}
