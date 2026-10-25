import type { ReactNode } from 'react'
import type { LandingSection } from '@/state/landing'
import s from './landing.module.css'
import { cx } from './cx'
import { Badge, type BadgeKind } from '@/ui/Badge'
import { inlineSegments, statusTone, type StatusTone } from './markdownTables'
import type { Photo } from './photos'

interface SectionProps {
  id: LandingSection
  className?: string | undefined
  /** A motion hook on the section itself (UI_CONTRACT 5.3), e.g. "bars" on section#play. */
  motion?: string | undefined
  children: ReactNode
}

/** Every landing section: a labelled landmark the scroll hook can find. Heading id is `${id}-title`. */
export function Section({ id, className, motion, children }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      data-landing-section={id}
      data-motion={motion}
      className={className}
    >
      {children}
    </section>
  )
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string | undefined }) {
  return <p className={cx(s.eyebrow, className)}>{children}</p>
}

/** The static DOM twin of the scene. Never a live region. */
export function Caption({
  children,
  className,
}: {
  children: ReactNode
  className?: string | undefined
}) {
  return (
    <p data-testid="caption" className={cx(s.caption, className)}>
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
      <path d="M10 2.5 18.5 17.5H1.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10 8v4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="14.9" r="1.1" fill="currentColor" />
    </svg>
  )
}

interface PhotoProps {
  photo: Photo
  /** CSS sizes hint for the browser's srcset choice. */
  sizes: string
  className?: string | undefined
}

/** A credited stock photo: lazy, fixed size, never in the hero. The credit is a figcaption, not a scene caption. */
export function PhotoFigure({ photo, sizes, className }: PhotoProps) {
  return (
    <figure className={cx(s.photo, className)} data-photo={photo.id}>
      <img
        src={photo.src}
        srcSet={photo.srcSet}
        sizes={sizes}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        loading="lazy"
        decoding="async"
      />
      <figcaption className={s.credit}>
        <a href={photo.sourceUrl} rel="noreferrer">
          {photo.credit}
        </a>
      </figcaption>
    </figure>
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
