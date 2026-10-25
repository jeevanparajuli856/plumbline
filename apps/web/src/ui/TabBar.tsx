import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { CONTACT_EMAIL } from '@/landing/content'
import { ThemeToggle } from './ThemeToggle'
import './tabBar.css'

interface Tab {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
}

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" {...STROKE}>
      {children}
    </svg>
  )
}

const HOME = (
  <Icon>
    <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1Z" />
  </Icon>
)
const STEPS = (
  <Icon>
    <circle cx="6" cy="6" r="2" />
    <circle cx="6" cy="18" r="2" />
    <path d="M6 8v8M11 6h9M11 12h9M11 18h9" />
  </Icon>
)
const EVIDENCE = (
  <Icon>
    <path d="M4 20h16M7 16v-4M12 16V7M17 16v-7" />
  </Icon>
)
const MORE = (
  <Icon>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </Icon>
)

const LEFT: readonly Tab[] = [
  { to: '/', label: 'Home', icon: HOME, end: true },
  { to: '/how-it-works', label: 'How it works', icon: STEPS },
]
const RIGHT: readonly Tab[] = [{ to: '/evidence', label: 'Evidence', icon: EVIDENCE }]

const SHEET_LINKS = [
  { to: '/app', label: 'The app', sentence: 'Install it on your phone, use it with your meter.' },
  { to: '/accessibility', label: 'Accessibility', sentence: 'Voice, keyboard and screen reader.' },
  { to: '/docs', label: 'Docs', sentence: 'Getting started, modes, shortcuts, privacy.' },
  { to: '/contact', label: 'Contact', sentence: 'Pilots, classrooms and questions.' },
  { to: '/about', label: 'About', sentence: 'Who builds Truehand and why.' },
] as const

/** Engines without the dialog API (jsdom, Safari before 15.4) fall back to the open attribute. */
function openSheet(d: HTMLDialogElement | null) {
  if (!d) return
  if (typeof d.showModal === 'function') d.showModal()
  else d.setAttribute('open', '')
}

function closeSheet(d: HTMLDialogElement | null) {
  if (!d) return
  if (typeof d.close === 'function') d.close()
  else d.removeAttribute('open')
}

const TAB =
  'tabbar-item flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[0.75rem] font-semibold leading-none text-muted aria-[current=page]:text-text'

/**
 * The phone navigation, below lg: four tabs and a raised Demo button in the middle, the way a
 * phone app is laid out. "More" opens a bottom sheet (a modal dialog, so focus stays inside it).
 */
export function TabBar() {
  const sheet = useRef<HTMLDialogElement>(null)
  const { pathname } = useLocation()

  useEffect(() => closeSheet(sheet.current), [pathname])

  const onSheetClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) closeSheet(e.currentTarget)
  }

  return (
    <>
      <nav aria-label="Primary" className="tabbar">
        <ul className="mx-auto flex max-w-xl items-stretch px-2">
          {LEFT.map((t) => (
            <li key={t.to} className="flex flex-1">
              <NavLink to={t.to} end={t.end ?? false} className={TAB}>
                <span className="tabbar-icon">{t.icon}</span>
                {t.label}
              </NavLink>
            </li>
          ))}
          <li className="flex flex-1 justify-center">
            <NavLink to="/sim" className="tabbar-demo" aria-label="Demo">
              <span className="tabbar-demo-disc">
                <DemoGlyph />
              </span>
              <span aria-hidden="true">Demo</span>
            </NavLink>
          </li>
          {RIGHT.map((t) => (
            <li key={t.to} className="flex flex-1">
              <NavLink to={t.to} className={TAB}>
                <span className="tabbar-icon">{t.icon}</span>
                {t.label}
              </NavLink>
            </li>
          ))}
          <li className="flex flex-1">
            <button
              type="button"
              className={TAB}
              aria-haspopup="dialog"
              onClick={() => openSheet(sheet.current)}
            >
              <span className="tabbar-icon">{MORE}</span>
              More
            </button>
          </li>
        </ul>
      </nav>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events -- backdrop tap; Escape closes natively */}
      <dialog
        ref={sheet}
        aria-labelledby="more-sheet-title"
        className="sheet"
        onClick={onSheetClick}
      >
        <div className="sheet-handle" aria-hidden="true" />
        <div className="flex items-center justify-between gap-4 px-5 pt-2">
          <h2 id="more-sheet-title" className="font-display text-2xl font-semibold">
            More
          </h2>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-full bg-surface-2 text-text"
              onClick={() => closeSheet(sheet.current)}
            >
              <Icon>
                <path d="M6 6l12 12M18 6 6 18" />
              </Icon>
              <span className="sr-only">Close</span>
            </button>
          </div>
        </div>
        <ul className="mt-4 px-3">
          {SHEET_LINKS.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className="flex min-h-16 items-center justify-between gap-4 rounded-soft px-3 py-3 transition-colors duration-[var(--motion-fast)] hover:bg-surface-2 active:bg-surface-2"
              >
                <span>
                  <span className="block font-semibold text-text">{l.label}</span>{' '}
                  <span className="block text-[0.9375rem] text-text-2">{l.sentence}</span>
                </span>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...STROKE}>
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mx-5 mt-4 border-t border-hairline pt-4 pb-2 text-[0.9375rem] text-text-2">
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-text underline underline-offset-4">
            {CONTACT_EMAIL}
          </a>
        </p>
      </dialog>
    </>
  )
}

/** The found hole from the mark, ringed: the way into the demo. */
function DemoGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
    </svg>
  )
}
