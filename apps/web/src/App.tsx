import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import { LiveRegion } from './a11y/LiveRegion'
import { startAnnouncer } from './a11y/announcer'
import { applyReduceMotion, useMotionPref } from './a11y/motionPref'
import { SkipLinks } from './a11y/SkipLinks'
import { useRouteFocus } from './a11y/useRouteFocus'
import { isPresentation } from './lib/env'
import { SceneHost } from './scene/SceneHost'
import { applyTheme, usePrefs } from './state/prefs'
import { PrefsBar } from './ui/PrefsBar'
import { SiteFooter } from './ui/SiteFooter'
import { SiteHeader } from './ui/SiteHeader'
import { useSystemTheme } from './ui/useSystemTheme'

export function App() {
  const theme = usePrefs((s) => s.theme)
  const reduceMotion = useMotionPref((s) => s.reduceMotion)
  const location = useLocation()
  const present = isPresentation(location.search)

  useEffect(() => applyTheme(theme), [theme])
  useSystemTheme(theme)
  useEffect(() => applyReduceMotion(reduceMotion), [reduceMotion])
  useEffect(() => startAnnouncer(), [])
  useRouteFocus(location.pathname)
  useEffect(() => {
    const root = document.documentElement
    if (present) root.dataset.present = 'true'
    else delete root.dataset.present
  }, [present])

  return (
    <div className="relative flex min-h-dvh flex-col">
      <SkipLinks />
      {present ? null : (
        <div className="relative z-10">
          <PrefsBar />
          <SiteHeader />
        </div>
      )}
      <SceneHost />
      <div className="relative z-10 flex-1">
        <Outlet />
      </div>
      {present ? null : (
        <div className="relative z-10">
          <SiteFooter />
        </div>
      )}
      <LiveRegion />
    </div>
  )
}
