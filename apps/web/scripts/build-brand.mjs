#!/usr/bin/env node
// Renders every raster brand asset from the Truehand SVG sources in public/brand/ with headless
// Chromium, so the icons and the social card are reproducible. Run: pnpm --filter web brand
// Outputs: public/favicon.svg, public/icons/{pwa-192,pwa-512,maskable-512,apple-touch-icon-180,favicon-32}.png,
// public/brand/og-image.png (1200 x 630).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url))
const brand = (f) => readFileSync(root(`public/brand/${f}`), 'utf8')
/** Fonts are inlined as data URLs: Chromium will not load file:// fonts into a setContent page. */
const font = (pkg, file) =>
  `data:font/woff2;base64,${readFileSync(root(`node_modules/${pkg}/files/${file}`)).toString('base64')}`

// Brand colours come from the logo files; the page colours from src/styles/tokens.json.
const tokens = JSON.parse(readFileSync(root('src/styles/tokens.json'), 'utf8')).themes
const BENCH = tokens.light.bench
const INK = tokens.light.ink
const TEXT_2 = tokens.light['text-2']
const HAIRLINE = tokens.light.hairline
const BRAND_LIGHT = '#C0271D'

/** The six-dot cell without its rounded tile, for square (maskable, Apple) icons. */
function squareIcon(background) {
  return brand('truehand-icon-light.svg')
    .replace(/<rect [^>]*\/>/, `<rect width="1024" height="1024" fill="${background}"/>`)
    .replace('#F4F1EA', background)
}

/** Favicon: the light tile, swapping to the dark tile when the OS is dark. */
function favicon() {
  const light = brand('truehand-icon-light.svg')
  return light
    .replace(
      '<rect',
      `<style>@media (prefers-color-scheme: dark){.tile{fill:#111111}.ring{stroke:#FFFFFF;opacity:.55}.found{stroke:#E8503F;fill:none}.dot{fill:#E8503F}}</style><rect class="tile"`,
    )
    .replaceAll(
      'stroke="#111111" stroke-width="22" opacity=".45"',
      'class="ring" stroke="#111111" stroke-width="22" opacity=".45"',
    )
    .replace('r="94" stroke="#C0271D"', 'r="94" class="found" stroke="#C0271D"')
    .replace('r="56" fill="#C0271D"', 'r="56" class="dot" fill="#C0271D"')
}

function ogHtml() {
  const mark = brand('truehand-mark.svg').replace(
    'width="62" height="83"',
    'width="186" height="249"',
  )
  return `<!doctype html><html><head><style>
@font-face{font-family:Fraunces;src:url(${font('@fontsource-variable/fraunces', 'fraunces-latin-opsz-normal.woff2')}) format('woff2');font-weight:100 900}
@font-face{font-family:Atkinson;src:url(${font('@fontsource/atkinson-hyperlegible-next', 'atkinson-hyperlegible-next-latin-400-normal.woff2')}) format('woff2');font-weight:400}
@font-face{font-family:Mono;src:url(${font('@fontsource-variable/jetbrains-mono', 'jetbrains-mono-latin-wght-normal.woff2')}) format('woff2');font-weight:100 900}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:${BENCH};color:${INK};font-family:Atkinson;display:grid;grid-template-columns:7fr 5fr;overflow:hidden}
.copy{padding:72px 0 64px 80px;display:flex;flex-direction:column}
.word{font-family:Fraunces;font-weight:600;font-size:44px;letter-spacing:-0.01em}
h1{font-family:Fraunces;font-weight:500;font-size:68px;line-height:1.02;margin-top:56px;font-variation-settings:'opsz' 144}
p{font-size:24px;line-height:1.45;color:${TEXT_2};margin-top:28px;max-width:30ch}
.tag{font-family:Mono;font-size:18px;color:${TEXT_2};margin-top:auto;letter-spacing:.04em}
.art{border-left:1px solid ${HAIRLINE};display:grid;place-items:center}
</style></head><body>
<div class="copy"><div class="word">Truehand</div>
<h1>Measurement you can trust without looking.</h1>
<p>A braille cell and a breadboard are the same shape. Truehand works out which hole your probe actually found.</p>
<div class="tag">truehand.tech &middot; research preview</div></div>
<div class="art">${mark}</div>
</body></html>`
}

async function shoot(page, html, size, out) {
  await page.setViewportSize(size)
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: root(out), omitBackground: true })
}

const svgPage = (svg, px) =>
  `<!doctype html><html><body style="margin:0">${svg.replace(/width="\d+" height="\d+"/, `width="${px}" height="${px}"`)}</body></html>`

mkdirSync(root('public/icons'), { recursive: true })
writeFileSync(root('public/favicon.svg'), favicon())

const browser = await chromium.launch()
const page = await browser.newPage()
const tile = brand('truehand-icon-light.svg')
await shoot(page, svgPage(tile, 192), { width: 192, height: 192 }, 'public/icons/pwa-192.png')
await shoot(page, svgPage(tile, 512), { width: 512, height: 512 }, 'public/icons/pwa-512.png')
await shoot(page, svgPage(tile, 32), { width: 32, height: 32 }, 'public/icons/favicon-32.png')
await shoot(
  page,
  svgPage(squareIcon(BENCH), 512),
  { width: 512, height: 512 },
  'public/icons/maskable-512.png',
)
await shoot(
  page,
  svgPage(squareIcon(BENCH), 180),
  { width: 180, height: 180 },
  'public/icons/apple-touch-icon-180.png',
)
await shoot(page, ogHtml(), { width: 1200, height: 630 }, 'public/brand/og-image.png')
await browser.close()
console.log(`brand assets written (brand red ${BRAND_LIGHT} from the logo files).`)
