/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrastRatio, relativeLuminance, themeBlocks } from './contrast'

// Vitest stubs CSS imports (even ?raw), so read the file; tests run from apps/web.
const css = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8')
/** WCAG 1.4.11 non-text contrast for graphical objects. */
const GRAPHICS_MIN = 3
/** Tokens the scene draws as strokes or edges on the board. */
const STROKE_TOKENS = ['--inferred', '--measured', '--warning', '--text'] as const

describe('contrast', () => {
  it('computes WCAG relative luminance and ratio', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 12)
    expect(relativeLuminance('#000000')).toBe(0)
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 12)
    expect(contrastRatio('#0b6478', '#d9d3c6')).toBeCloseTo(4.53, 2)
    expect(contrastRatio('#5fd3e8', '#d9d3c6')).toBeCloseTo(1.18, 2)
  })

  it('reads the light, dark and high-contrast blocks from tokens.css', () => {
    const themes = themeBlocks(css)
    expect(themes.light['--scene-board']).toBe('#d9d3c6')
    expect(themes.dark['--scene-board']).toBe('#23272e')
    expect(themes.hc['--scene-board']).toBe('#1a1a1a')
  })

  for (const theme of ['light', 'dark', 'hc'] as const) {
    it(`keeps every scene stroke at 3:1 or more on the board (${theme})`, () => {
      const t = themeBlocks(css)[theme]
      const board = t['--scene-board']!
      for (const token of STROKE_TOKENS) {
        expect(
          contrastRatio(t[token]!, board),
          `${token} on ${theme} board`,
        ).toBeGreaterThanOrEqual(GRAPHICS_MIN)
      }
    })
  }
})
