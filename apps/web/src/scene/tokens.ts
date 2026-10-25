import { useSyncExternalStore } from 'react'

/**
 * Scene colours read from the CSS design tokens, so the 3D view follows data-theme.
 * UI-semantic colours (measured, inferred, warning, board) come from tokens.css. Physical
 * materials (probe plastic, wire insulation, resistor bands) have no token yet; they read an
 * optional `--scene-*` property and fall back to an hsl() value (requested in LANE_REQUESTS.md).
 */
export interface SceneTokens {
  sceneBg: string
  sceneBoard: string
  sceneHole: string
  /** Text-safe accents; 3:1 or more on the board in every theme, so used for strokes and edges. */
  measured: string
  inferred: string
  /** Pale fills: glow bodies and areas only, never a stroke (1.2:1 on the light board). */
  measuredFill: string
  inferredFill: string
  warning: string
  text: string
  text2: string
  hairline: string
  glowMax: number
  probe: string
  lead: string
  metal: string
  resistor: string
  led: string
  battery: string
  railPositive: string
  railNegative: string
  roastCrust: string
  roastCentre: string
}

type ColourKey = Exclude<keyof SceneTokens, 'glowMax'>

const COLOUR_SOURCES: Record<ColourKey, [cssVar: string, fallback: string]> = {
  sceneBg: ['--scene-bg', 'hsl(43, 37%, 94%)'],
  sceneBoard: ['--scene-board', 'hsl(40, 19%, 81%)'],
  sceneHole: ['--scene-hole', 'hsl(40, 13%, 20%)'],
  measured: ['--measured', 'hsl(36, 100%, 27%)'],
  inferred: ['--inferred', 'hsl(191, 83%, 26%)'],
  measuredFill: ['--measured-fill', 'hsl(36, 88%, 59%)'],
  inferredFill: ['--inferred-fill', 'hsl(189, 75%, 64%)'],
  warning: ['--warning', 'hsl(8, 77%, 39%)'],
  text: ['--text', 'hsl(214, 14%, 10%)'],
  text2: ['--text-2', 'hsl(216, 8%, 32%)'],
  hairline: ['--hairline', 'hsl(40, 13%, 77%)'],
  probe: ['--scene-probe', 'hsl(2, 68%, 44%)'],
  lead: ['--scene-lead', 'hsl(220, 8%, 14%)'],
  metal: ['--scene-metal', 'hsl(210, 6%, 70%)'],
  resistor: ['--scene-resistor', 'hsl(38, 45%, 72%)'],
  led: ['--scene-led', 'hsl(355, 75%, 52%)'],
  battery: ['--scene-battery', 'hsl(220, 10%, 22%)'],
  railPositive: ['--scene-rail-positive', 'hsl(2, 60%, 52%)'],
  railNegative: ['--scene-rail-negative', 'hsl(212, 60%, 46%)'],
  roastCrust: ['--scene-roast-crust', 'hsl(24, 42%, 33%)'],
  roastCentre: ['--scene-roast-centre', 'hsl(352, 52%, 68%)'],
}

const GLOW_MAX_FALLBACK = 1.2

export function readSceneTokens(root?: Element): SceneTokens {
  const style =
    typeof document === 'undefined' ? null : getComputedStyle(root ?? document.documentElement)
  const read = (name: string, fallback: string) => style?.getPropertyValue(name).trim() || fallback
  const colours = Object.fromEntries(
    Object.entries(COLOUR_SOURCES).map(([key, [cssVar, fallback]]) => [
      key,
      read(cssVar, fallback),
    ]),
  ) as Record<ColourKey, string>
  const glow = Number.parseFloat(read('--scene-glow-max', String(GLOW_MAX_FALLBACK)))
  return { ...colours, glowMax: Number.isFinite(glow) ? glow : GLOW_MAX_FALLBACK }
}

let snapshot: SceneTokens | null = null
const listeners = new Set<() => void>()
let stopWatching: (() => void) | null = null

function refresh(): void {
  snapshot = readSceneTokens()
  listeners.forEach((l) => l())
}

function watch(): () => void {
  const observer = new MutationObserver(refresh)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class'],
  })
  const queries = ['(prefers-color-scheme: dark)', '(prefers-contrast: more)'].map((q) =>
    window.matchMedia?.(q),
  )
  queries.forEach((q) => q?.addEventListener('change', refresh))
  return () => {
    observer.disconnect()
    queries.forEach((q) => q?.removeEventListener('change', refresh))
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (!stopWatching && typeof document !== 'undefined') stopWatching = watch()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && stopWatching) {
      stopWatching()
      stopWatching = null
    }
  }
}

function getSnapshot(): SceneTokens {
  if (!snapshot) snapshot = readSceneTokens()
  return snapshot
}

/** Current scene tokens; re-renders when the theme attribute or OS scheme changes. */
export function useSceneTokens(): SceneTokens {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
