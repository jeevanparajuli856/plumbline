#!/usr/bin/env node
/**
 * Still renders of our own 3D breadboard scene for the marketing pages (POSITIONING 4.2.1: no
 * stock photography). Opens How it works in a built app with WebGL, scrolls to the worked
 * example so the camera rests on its pose (choreography `poseAt`), hides the page chrome, and
 * saves the scene as WebP at 1600 and 800 px wide, light and dark.
 *
 * Usage (from apps/web):
 *   pnpm build && pnpm preview --port 5182 --strictPort &
 *   node scripts/render-scene.mjs            # TRUEHAND_RENDER_URL overrides the base URL
 * Needs `cwebp` on the PATH (brew install webp).
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const BASE = process.env.TRUEHAND_RENDER_URL ?? 'http://localhost:5182'
const OUT_DIR = fileURLToPath(new URL('../src/landing/assets/renders/', import.meta.url))
/** Viewport wide enough that the play pose frames the whole board with the battery. */
const VIEWPORT = { width: 2000, height: 1000 }
const SCALE = 2
/** Crop around the board in CSS px at that viewport, 16:10. */
const CROP = { x: 60, y: 160, width: 1020, height: 638 }
const WIDTHS = [1600, 800]
/** Section top this far below the viewport top puts the camera on the play pose. */
const PLAY_OFFSET_PX = 300
const SETTLE_MS = 2500

const RENDERS = [{ name: 'board', section: 'section#play', offset: PLAY_OFFSET_PX }]
const SCHEMES = ['light', 'dark']

async function capture(browser, render, scheme, dir) {
  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    colorScheme: scheme,
  })
  await page.goto(`${BASE}/how-it-works`)
  await page.waitForSelector('canvas', { state: 'attached' })
  await page.waitForTimeout(SETTLE_MS)
  await page.evaluate(
    ([selector, offset]) => {
      const el = document.querySelector(selector)
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - offset)
    },
    [render.section, render.offset],
  )
  await page.waitForTimeout(SETTLE_MS)
  await page.addStyleTag({ content: 'header, footer, main { visibility: hidden !important }' })
  await page.waitForTimeout(400)
  const png = join(dir, `${render.name}-${scheme}.png`)
  await page.screenshot({ path: png })
  await page.close()
  return png
}

function toWebp(png, name, scheme) {
  for (const width of WIDTHS) {
    const out = join(OUT_DIR, `${name}-${scheme}-${width}.webp`)
    execFileSync('cwebp', [
      '-quiet',
      '-q',
      '82',
      '-metadata',
      'none',
      '-crop',
      String(CROP.x * SCALE),
      String(CROP.y * SCALE),
      String(CROP.width * SCALE),
      String(CROP.height * SCALE),
      '-resize',
      String(width),
      '0',
      png,
      '-o',
      out,
    ])
    console.log(`wrote ${out}`)
  }
}

mkdirSync(OUT_DIR, { recursive: true })
const scratch = mkdtempSync(join(tmpdir(), 'truehand-render-'))
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'],
})
try {
  for (const render of RENDERS) {
    for (const scheme of SCHEMES)
      toWebp(await capture(browser, render, scheme, scratch), render.name, scheme)
  }
} finally {
  await browser.close()
  rmSync(scratch, { recursive: true, force: true })
}
