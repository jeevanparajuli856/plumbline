import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'

/**
 * Top-level routes served by the single-page app. The static host (Render) has no rewrite rule,
 * so the build copies index.html into each route's folder; refreshing /how-it-works then serves
 * the app instead of a 404. spaRoutes.test.ts keeps this list in step with src/routes.tsx.
 */
export const SPA_ROUTES = [
  'sim',
  'how-it-works',
  'evidence',
  'app',
  'accessibility',
  'contact',
  'about',
] as const

export function spaRouteCopies(outDir = 'dist'): Plugin {
  return {
    name: 'truehand-spa-route-copies',
    apply: 'build',
    closeBundle() {
      const index = join(outDir, 'index.html')
      for (const route of SPA_ROUTES) {
        mkdirSync(join(outDir, route), { recursive: true })
        copyFileSync(index, join(outDir, route, 'index.html'))
      }
      // Unknown paths still reach the app, which renders its own NotFound page.
      copyFileSync(index, join(outDir, '404.html'))
    },
  }
}
