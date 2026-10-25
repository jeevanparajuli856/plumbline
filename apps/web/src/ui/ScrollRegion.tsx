import type { ReactNode } from 'react'

interface ScrollRegionProps {
  label: string
  className?: string
  children: ReactNode
}

/**
 * A wide table's sideways scroller. It is focusable and named so keyboard users can scroll it
 * (axe scrollable-region-focusable, WCAG 2.1.1).
 */
export function ScrollRegion({ label, className = '', children }: ScrollRegionProps) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={`overflow-x-auto rounded-hard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${className}`.trim()}
    >
      {children}
    </div>
  )
}
