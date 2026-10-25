import { Link, NavLink } from 'react-router'
import { buttonClass } from './button'
import { BrandMark } from './BrandMark'
import { ThemeToggle } from './ThemeToggle'
import { useMediaQuery } from './useMediaQuery'

const LINKS = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/evidence', label: 'Evidence' },
  { to: '/app', label: 'The app' },
  { to: '/accessibility', label: 'Accessibility' },
] as const

const NAV_LINK =
  'inline-flex min-h-11 items-center border-b-2 border-transparent px-3 font-medium text-text-2 transition-colors duration-[var(--motion-fast)] hover:border-hairline hover:text-text aria-[current=page]:border-text aria-[current=page]:text-text max-sm:px-0'

/** Tailwind's lg. The CSS below and this query must agree. */
const ONE_ROW = '(min-width: 64rem)'

/**
 * One 72px bar that follows the theme: wordmark, primary nav, theme toggle, Demo.
 * Below lg the nav drops to a second row under a hairline so nothing scrolls sideways at 390px,
 * and moves after Demo in the DOM so Tab follows the rows as drawn.
 */
export function SiteHeader() {
  const isOneRow = useMediaQuery(ONE_ROW, true)
  return (
    <header className="border-b border-hairline bg-bench">
      <div className="relative mx-auto flex max-w-[90rem] flex-wrap items-center gap-x-3 px-4 sm:gap-x-4 sm:px-8 lg:flex-nowrap lg:gap-x-6 lg:px-16">
        <Link
          to="/"
          className="mr-auto inline-flex h-[var(--header-height)] shrink-0 items-center gap-2.5 rounded-hard"
        >
          <BrandMark />
          <span className="font-display text-lg font-semibold leading-none tracking-tight">
            Truehand
          </span>
        </Link>
        {isOneRow ? <PrimaryNav /> : null}
        <ThemeToggle />
        <Link to="/sim" className={buttonClass('ink', 'shrink-0')}>
          Demo
        </Link>
        {isOneRow ? null : <PrimaryNav />}
      </div>
    </header>
  )
}

function PrimaryNav() {
  return (
    <nav
      aria-label="Primary"
      className="basis-full border-t border-hairline lg:basis-auto lg:border-t-0"
    >
      <ul className="flex flex-wrap max-sm:justify-between sm:-mx-3">
        {LINKS.map((l) => (
          <li key={l.to}>
            <NavLink to={l.to} className={NAV_LINK}>
              {l.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
