import { useEffect, useState } from 'react'
import { useReducedMotion } from '@/a11y/useReducedMotion'
import './launchSplash.css'

const SEEN_KEY = 'truehand.splash'

/** Full animation, then the fade; the reduced version holds a still mark briefly. */
const HOLD_MS = 1500
const HOLD_REDUCED_MS = 450
const FADE_MS = 420

const HOLES = [
  [0, 0],
  [0, 26],
  [0, 52],
  [26, 0],
  [26, 52],
] as const

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches
}

/**
 * Shows once per launch when Truehand is opened from the home screen, or with ?splash=1 to
 * preview it. A browser tab never sees it.
 */
function shouldShowSplash(search: string): boolean {
  if (new URLSearchParams(search).has('splash')) return true
  if (!isStandalone()) return false
  try {
    if (sessionStorage.getItem(SEEN_KEY)) return false
    sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* storage unavailable: show it every time */
  }
  return true
}

let launchDecision: boolean | null = null

/** Decided once per page load, so a second render (StrictMode) agrees with the first. */
function decideOnce(): boolean {
  launchDecision ??= shouldShowSplash(typeof window === 'undefined' ? '' : window.location.search)
  return launchDecision
}

/**
 * The launch screen of the installed app: the braille cell draws in hole by hole, the found hole
 * lands in red, the wordmark rises, then the whole screen fades into the app. Decorative and
 * inert; the page underneath is already rendered and announced.
 */
export function LaunchSplash() {
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<'off' | 'on' | 'leaving'>(() => (decideOnce() ? 'on' : 'off'))

  useEffect(() => {
    if (phase !== 'on') return
    const t = window.setTimeout(() => setPhase('leaving'), reduced ? HOLD_REDUCED_MS : HOLD_MS)
    return () => window.clearTimeout(t)
  }, [phase, reduced])

  useEffect(() => {
    if (phase !== 'leaving') return
    const t = window.setTimeout(() => setPhase('off'), reduced ? 0 : FADE_MS)
    return () => window.clearTimeout(t)
  }, [phase, reduced])

  if (phase === 'off') return null
  return (
    <div
      className="launch-splash"
      data-leaving={phase === 'leaving' ? 'true' : undefined}
      data-reduced={reduced ? 'true' : undefined}
      aria-hidden="true"
      inert
    >
      <div className="launch-splash-stack">
        <svg viewBox="-15.5 -15.5 62.5 83" width="84" height="112" fill="none">
          {HOLES.map(([cx, cy], i) => (
            <circle
              key={`${cx},${cy}`}
              className="launch-hole"
              style={{ animationDelay: `${i * 90}ms` }}
              cx={cx}
              cy={cy}
              r="8"
              stroke="currentColor"
              strokeWidth="3"
            />
          ))}
          <circle className="launch-ring" cx="26" cy="26" r="13.5" stroke="var(--brand)" strokeWidth="3" />
          <circle className="launch-found" cx="26" cy="26" r="8" fill="var(--brand)" />
        </svg>
        <p className="launch-word">Truehand</p>
        <p className="launch-tag">Measurement you can trust without looking.</p>
      </div>
    </div>
  )
}
