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
  { to: '/docs', label: 'Docs' },
] as const

// The current page gets a soft pill; hover previews it.
const NAV_LINK =
  'relative inline-flex min-h-10 items-center rounded-full px-3.5 font-medium text-text-2 transition-[color,background-color] duration-[var(--motion-fast)] ease-[var(--ease-smooth)] hover:bg-surface-2 hover:text-text aria-[current=page]:bg-surface-2 aria-[current=page]:text-text'

/** Tailwind's lg. The CSS below and this query must agree. */
export const ONE_ROW = '(min-width: 64rem)'

/**
 * One sticky, frosted bar that follows the theme. At lg and up: wordmark, primary nav, theme
 * toggle, Demo. Below lg the bar keeps the wordmark and the toggle; the primary nav and Demo live
 * in the phone tab bar at the bottom of the screen (TabBar).
 */
export function SiteHeader() {
  const isOneRow = useMediaQuery(ONE_ROW, true)
  return (
    <header className="site-header border-b border-hairline bg-[color-mix(in_srgb,var(--bench)_80%,transparent)] pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150">
      <div className="relative mx-auto flex max-w-[90rem] items-center gap-x-3 px-4 sm:gap-x-4 sm:px-8 lg:gap-x-6 lg:px-16">
        <Link
          to="/"
          className="mr-auto inline-flex h-14 shrink-0 items-center gap-2.5 rounded-hard lg:h-[var(--header-height)]"
        >
          <BrandMark />
          <span className="font-display text-lg font-semibold leading-none tracking-tight">
            Truehand
          </span>
        </Link>
        {isOneRow ? <PrimaryNav /> : null}
        <ThemeToggle />
        {isOneRow ? (
          <Link to="/sim" className={buttonClass('ink', 'shrink-0 rounded-full px-5')}>
            Demo
          </Link>
        ) : null}
      </div>
    </header>
  )
}

function PrimaryNav() {
  return (
    <nav aria-label="Primary">
      <ul className="flex gap-1">
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
