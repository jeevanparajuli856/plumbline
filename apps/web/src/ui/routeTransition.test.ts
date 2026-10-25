import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { markRouteTransition, routeTransitionClass } from './routeTransition'

const transitionCss = readFileSync(resolve(__dirname, 'viewTransition.css'), 'utf8')

afterEach(() => {
  delete document.documentElement.dataset.routeTransition
})

describe('route transition', () => {
  it('animates with the route class, or not at all under reduced motion', () => {
    expect(routeTransitionClass(false)).toBe('route')
    expect(routeTransitionClass(true)).toBe('none')
  })

  it('marks html for the duration of a route transition and clears it on cleanup', () => {
    const cleanup = markRouteTransition()
    expect(document.documentElement.dataset.routeTransition).toBe('true')
    cleanup()
    expect(document.documentElement.dataset.routeTransition).toBeUndefined()
  })

  it('keeps route and theme CSS apart: the route class, the scoped root and a still header', () => {
    expect(transitionCss).toMatch(/::view-transition-old\(\.route\)/)
    expect(transitionCss).toMatch(/::view-transition-new\(\.route\)/)
    expect(transitionCss).toMatch(/html\[data-route-transition\]::view-transition-old\(root\)/)
    expect(transitionCss).toMatch(/html\[data-theme-reveal\]::view-transition-new\(root\)/)
    // The header is its own still group for route changes, but stays inside the theme reveal.
    expect(transitionCss).toMatch(/html:not\(\[data-theme-reveal\]\) \.site-header/)
    expect(transitionCss).toMatch(/view-transition-name: site-header/)
  })

  it('snaps every view transition under reduced motion, OS or in-page', () => {
    expect(transitionCss).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
    expect(transitionCss).toMatch(/html\[data-reduce-motion\]::view-transition-old\(\*\)/)
  })

  it('turns the toggle glyph 90 degrees during the theme reveal only', () => {
    expect(transitionCss).toMatch(/html\[data-theme-reveal\] \.theme-glyph/)
    expect(transitionCss).toMatch(/html\[data-theme-reveal\]::view-transition-new\(theme-glyph\)/)
    expect(transitionCss).toMatch(/rotate: 90deg|rotate\(90deg\)/)
  })
})
