import { NavLink } from 'react-router'

const LINKS = [
  { to: '/sim', label: 'Simulator' },
  { to: '/evidence', label: 'Validation' },
  { to: '/about', label: 'About' },
] as const

/** Wordmark with the plumb-line glyph, and primary navigation. Current page is marked by rule and aria-current. */
export function SiteHeader() {
  return (
    <header className="border-b-2 border-text bg-bench">
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-end justify-between gap-x-8 gap-y-2 px-4 pb-0 pt-3 sm:px-8 lg:px-16">
        <NavLink
          to="/"
          className="group mb-2 inline-flex items-center gap-2.5 rounded-hard text-lg font-semibold leading-none tracking-tight"
        >
          <PlumbGlyph />
          <span>Plumbline</span>
        </NavLink>
        <nav aria-label="Primary">
          <ul className="flex gap-1">
            {LINKS.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  className="-mb-0.5 inline-flex min-h-11 items-center border-b-4 border-transparent px-3 font-medium text-text-2 hover:border-hairline hover:text-text aria-[current=page]:border-text aria-[current=page]:text-text"
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}

function PlumbGlyph() {
  return (
    <svg aria-hidden="true" width="18" height="28" viewBox="0 0 18 28" className="shrink-0">
      <line x1="9" y1="0" x2="9" y2="17" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9 17 L15 21 L9 28 L3 21 Z"
        fill="var(--measured-fill)"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}
