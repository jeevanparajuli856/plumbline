import type { ReactNode } from 'react'
import type { LandingSection } from '@/state/landing'
import s from './landing.module.css'
import { cx } from './cx'
import { inlineSegments, type StatusTone } from './markdownTables'

interface SectionProps {
  id: LandingSection
  className?: string | undefined
  children: ReactNode
}

/** Every landing section: a labelled landmark the scroll hook can find. Heading id is `${id}-title`. */
export function Section({ id, className, children }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      data-landing-section={id}
      className={className}
    >
      {children}
    </section>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className={s.eyebrow}>{children}</p>
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

export type BadgeKind = 'PROVISIONAL' | 'SIMULATED' | 'PENDING'

const BADGE_CLASS: Record<BadgeKind, string> = {
  PROVISIONAL: s.badgeProvisional!,
  SIMULATED: s.badgeSimulated!,
  PENDING: s.badgePending!,
}

export function Badge({ kind }: { kind: BadgeKind }) {
  return (
    <span data-testid="badge" className={cx(s.badge, BADGE_CLASS[kind])}>
      {kind}
    </span>
  )
}

const TONE_CLASS: Record<StatusTone, string> = {
  done: s.badgeDone!,
  progress: s.badgeProgress!,
  pending: s.badgePending!,
  simulated: s.badgeSimulated!,
}

/** Evidence status, verbatim from docs/EVIDENCE.md, styled by tone. */
export function StatusBadge({ status, tone }: { status: string; tone: StatusTone }) {
  return (
    <span data-testid="badge" className={cx(s.badge, TONE_CLASS[tone])}>
      {status.toUpperCase()}
    </span>
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
