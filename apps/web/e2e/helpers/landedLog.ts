import type { Page } from '@playwright/test'

declare global {
  interface Window {
    __e2eLanded?: string[][]
  }
}

/** Contract column order: Step, Told, Reading, Landed, Warning. */
const LANDED_COLUMN = 3

/**
 * Records, per reading-log row, every distinct text its Landed cell shows, from the first frame
 * the row exists. A leak shows up as a landed row before "hidden", which sampling cannot catch.
 */
export async function recordLandedCells(page: Page): Promise<void> {
  await page.addInitScript((column) => {
    const log: string[][] = []
    window.__e2eLanded = log
    const nameOf = (table: HTMLTableElement): string => {
      const labelledBy = table.getAttribute('aria-labelledby')
      if (labelledBy)
        return labelledBy
          .split(' ')
          .map((id) => document.getElementById(id)?.textContent ?? '')
          .join(' ')
          .trim()
      return (table.getAttribute('aria-label') ?? table.caption?.textContent ?? '').trim()
    }
    const check = () => {
      const table = Array.from(document.querySelectorAll('table')).find(
        (t) => nameOf(t) === 'Reading log',
      )
      if (!table) return
      const rows = Array.from(table.rows).filter((r) => r.querySelector(':scope > td'))
      rows.forEach((row, i) => {
        const text =
          row.querySelectorAll(':scope > th, :scope > td')[column]?.textContent?.trim() ?? ''
        const seen = (log[i] ??= [])
        if (text && seen[seen.length - 1] !== text) seen.push(text)
      })
    }
    const start = () =>
      new MutationObserver(check).observe(document.documentElement, {
        subtree: true,
        childList: true,
        characterData: true,
      })
    if (document.documentElement) start()
    else document.addEventListener('DOMContentLoaded', start)
  }, LANDED_COLUMN)
}

export async function readLandedLog(page: Page): Promise<string[][]> {
  return (await page.evaluate(() => window.__e2eLanded)) ?? []
}

/**
 * True when the store will hold the reveal for the scene's probe animation: a scene is
 * rendering and neither the OS nor the app-wide switch asks for reduced motion.
 */
export async function revealAnimates(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const reduced =
      matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset.reduceMotion === 'true'
    const frames =
      (window as { __plumblineScene?: { frames: number } }).__plumblineScene?.frames ?? 0
    return !reduced && frames > 0
  })
}
