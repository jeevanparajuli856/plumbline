import { useEffect, ViewTransition } from 'react'
import { Outlet, useLocation } from 'react-router'
import { LiveRegion } from './a11y/LiveRegion'
import { startAnnouncer } from './a11y/announcer'
import { wireVoice } from './voice/wire'
import { applyReduceMotion, useMotionPref } from './a11y/motionPref'
import { SkipLinks } from './a11y/SkipLinks'
import { useReducedMotion } from './a11y/useReducedMotion'
import { useRouteFocus } from './a11y/useRouteFocus'
import { isPresentation } from './lib/env'
import { SceneHost } from './scene/SceneHost'
import { applyTheme, usePrefs } from './state/prefs'
import { markRouteTransition, routeTransitionClass } from './ui/routeTransition'
import { SiteFooter } from './ui/SiteFooter'
import { SiteHeader } from './ui/SiteHeader'
import { useHashScroll } from './ui/useHashScroll'
import { useSystemTheme } from './ui/useSystemTheme'

export function App() {
  const theme = usePrefs((s) => s.theme)
  const reduceMotion = useMotionPref((s) => s.reduceMotion)
  const location = useLocation()
  const present = isPresentation(location.search)
  const routeClass = routeTransitionClass(useReducedMotion())

  useEffect(() => applyTheme(theme), [theme])
  useSystemTheme(theme)
  useEffect(() => applyReduceMotion(reduceMotion), [reduceMotion])
  useEffect(() => startAnnouncer(), [])
  useEffect(() => wireVoice(), [])
  useRouteFocus(location.pathname)
  useHashScroll(location.hash, location.key)
  useEffect(() => {
    const root = document.documentElement
    if (present) root.dataset.present = 'true'
    else delete root.dataset.present
  }, [present])

  return (
    <div className="relative flex min-h-dvh flex-col">
      <SkipLinks />
      {present ? null : (
        <div className="relative z-20">
          <SiteHeader />
        </div>
      )}
      <SceneHost />
      {/* Keyed by path: a route change exits the old page and enters the new one. default="none"
          keeps in-page transitions (belief updates, replay) from animating the whole page. */}
      <ViewTransition
        key={location.pathname}
        enter={routeClass}
        exit={routeClass}
        default="none"
        onEnter={markRouteTransition}
      >
        <div className="relative z-10 flex-1">
          <Outlet />
        </div>
      </ViewTransition>
      {present ? null : (
        <div className="relative z-10">
          <SiteFooter />
        </div>
      )}
      <LiveRegion />
    </div>
  )
}
