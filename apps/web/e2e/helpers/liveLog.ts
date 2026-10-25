import type { BrowserContext, Page } from '@playwright/test'

declare global {
  interface Window {
    __e2eLive?: { assertive: string[]; polite: string[]; warningBannerMounts: number }
  }
}

/**
 * Records every non-empty text the live regions (`#live-assertive`, `#live-polite` from
 * `src/a11y/LiveRegion.tsx`) receive and every time a warning banner is inserted, so a spec can
 * assert "announced once" instead of sampling the DOM at one instant.
 */
export async function recordLiveRegions(target: Page | BrowserContext): Promise<void> {
  await target.addInitScript(() => {
    const log = { assertive: [] as string[], polite: [] as string[], warningBannerMounts: 0 }
    window.__e2eLive = log
    const lastText: Record<string, string> = {}
    const observer = new MutationObserver((mutations) => {
      for (const id of ['live-assertive', 'live-polite'] as const) {
        const text = document.getElementById(id)?.textContent?.trim() ?? ''
        if (text && text !== lastText[id])
          log[id === 'live-assertive' ? 'assertive' : 'polite'].push(text)
        lastText[id] = text
      }
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return
          const banners = node.matches('[data-testid="warning-banner"]')
            ? 1
            : node.querySelectorAll('[data-testid="warning-banner"]').length
          log.warningBannerMounts += banners
        })
      }
    })
    const start = () =>
      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        characterData: true,
      })
    if (document.documentElement) start()
    else document.addEventListener('DOMContentLoaded', start)
  })
}

export async function readLiveLog(page: Page): Promise<NonNullable<Window['__e2eLive']>> {
  const log = await page.evaluate(() => window.__e2eLive)
  if (!log) throw new Error('recordLiveRegions was not installed before navigation.')
  return log
}
