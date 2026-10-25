import { expect, type BrowserContext, type Page } from '@playwright/test'

export type ThemeName = 'light' | 'dark' | 'hc'

/** Persisted prefs key from `src/state/prefs.ts` (zustand `persist`). */
const PREFS_KEY = 'truehand.prefs'

/**
 * Seeds the theme preference before the app boots, the same thing the Theme radiogroup stores,
 * so a page loads straight into the theme without a flash or a click.
 */
export async function setTheme(target: Page | BrowserContext, theme: ThemeName): Promise<void> {
  await target.addInitScript(
    ({ key, value }) => {
      const stored = JSON.parse(window.localStorage.getItem(key) ?? 'null') as {
        state?: Record<string, unknown>
      } | null
      const state = { ...(stored?.state ?? {}), theme: value }
      window.localStorage.setItem(key, JSON.stringify({ state, version: 0 }))
    },
    { key: PREFS_KEY, value: theme },
  )
}

/** The app applies the theme as `<html data-theme>`; specs assert it took effect before auditing. */
export async function expectTheme(page: Page, theme: ThemeName): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
}
