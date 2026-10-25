import { useId, useState, type ReactNode } from 'react'

interface SmallScreenDisclosureProps {
  label: string
  className: string
  children: ReactNode
}

/**
 * On phones a settings row collapses behind one button so the instruction is on the first screen.
 * From the sm breakpoint up the button is gone and the row is always shown.
 */
export function SmallScreenDisclosure({ label, className, children }: SmallScreenDisclosureProps) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 items-center gap-2 rounded-hard px-1 font-medium hover:bg-surface-2 sm:hidden"
      >
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={`transition-transform duration-[var(--motion-fast)] ${open ? 'rotate-90' : ''}`}
        >
          <path d="M3 1 L9 6 L3 11 Z" fill="currentColor" />
        </svg>
        {label}
      </button>
      <div id={id} className={`${open ? 'flex' : 'hidden'} sm:flex ${className}`}>
        {children}
      </div>
    </>
  )
}
