import { useEffect } from 'react'
import { Link, Outlet } from 'react-router'
import { LiveRegion } from './a11y/LiveRegion'
import { startAnnouncer } from './a11y/announcer'
import { SceneHost } from './scene/SceneHost'
import { applyTheme, usePrefs } from './state/prefs'

export function App() {
  const theme = usePrefs((s) => s.theme)
  useEffect(() => applyTheme(theme), [theme])
  useEffect(() => startAnnouncer(), [])
  return (
    <div className="relative min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-surface-1 focus:px-3 focus:py-2"
      >
        Skip to main content
      </a>
      <header className="relative z-10 flex items-center justify-between border-b border-hairline bg-surface-1 px-4 py-3">
        <Link to="/" className="font-semibold">
          Plumbline
        </Link>
        <nav aria-label="Primary" className="flex gap-5 text-sm font-medium">
          <Link to="/sim">Simulator</Link>
          <Link to="/evidence">Validation</Link>
          <Link to="/about">About</Link>
        </nav>
      </header>
      <SceneHost />
      <div className="relative z-10">
        <Outlet />
      </div>
      <LiveRegion />
    </div>
  )
}
