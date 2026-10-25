import { Link, NavLink, useLocation } from 'react-router'
import { buttonClass } from './button'
import { BrandMark } from './BrandMark'
import { DisplayMenu } from './DisplayMenu'
import { useMediaQuery } from './useMediaQuery'

/** Landing sections are hash links; only Validation is its own page and can be current. */
const LINKS = [
  { to: '/#research', label: 'Research' },
  { to: '/#play', label: 'Technology' },
  { to: '/evidence', label: 'Validation', page: true },
  { to: '/#product', label: 'Product' },
] as const

const NAV_LINK =
  'inline-flex min-h-11 items-center border-b-2 border-transparent px-3 font-medium text-text-2 transition-colors duration-[var(--motion-fast)] hover:border-hairline hover:text-text aria-[current=page]:border-text aria-[current=page]:text-text'

/** Tailwind's xl. The CSS below and this query must agree. */
const ONE_ROW = '(min-width: 80rem)'

/**
 * One 72px bar: wordmark, primary nav, the theme button, the way into the simulator.
 * Below xl the nav drops to a second row under a hairline so nothing scrolls sideways at 390px,
 * and moves after the simulator link in the DOM so Tab follows the rows as drawn.
 */
export function SiteHeader() {
  const { pathname } = useLocation()
  const isOneRow = useMediaQuery(ONE_ROW, true)
  return (
    <header className="border-b border-hairline bg-bench">
      <div className="relative mx-auto flex max-w-[90rem] flex-wrap items-center gap-x-3 px-4 sm:gap-x-4 sm:px-8 lg:px-16 xl:flex-nowrap xl:gap-x-6">
        <Link
          to="/"
          className="mr-auto inline-flex h-[var(--header-height)] shrink-0 items-center gap-2.5 rounded-hard"
        >
          <BrandMark />
          <span className="font-display text-lg font-semibold leading-none tracking-tight">
            Truehand
          </span>{' '}
          <span className="max-sm:sr-only border-l border-hairline pl-2.5 font-mono text-caption leading-none text-text-muted">
            research preview
          </span>
        </Link>
        {isOneRow ? <PrimaryNav /> : null}
        <DisplayMenu />
        <Link
          to="/sim"
          aria-current={pathname === '/sim' ? 'page' : undefined}
          className={buttonClass('ink', 'shrink-0 px-3 max-sm:text-caption sm:px-4')}
        >
          Open the simulator
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
      className="basis-full border-t border-hairline xl:basis-auto xl:border-t-0"
    >
      <ul className="-mx-3 flex flex-wrap">
        {LINKS.map((l) => (
          <li key={l.to}>
            {'page' in l ? (
              <NavLink to={l.to} className={NAV_LINK}>
                {l.label}
              </NavLink>
            ) : (
              <Link to={l.to} className={NAV_LINK}>
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
