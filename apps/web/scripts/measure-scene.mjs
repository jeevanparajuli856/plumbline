import { chromium } from '@playwright/test'
const BASE = process.env.TRUEHAND_PERF_BASE_URL ?? 'http://localhost:4393'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const scene = () => page.evaluate(() => window.__truehandScene ?? null)
async function framesOver(ms) {
  const a = (await scene())?.frames ?? 0
  await page.waitForTimeout(ms)
  const b = (await scene())?.frames ?? 0
  return b - a
}
async function settle() { await page.waitForTimeout(2500) }
const out = {}
const gpu = await page.goto(BASE + '/sim?demo=worked-example') && await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2')
  const ext = gl?.getExtension('WEBGL_debug_renderer_info')
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown'
})
out.gpu = gpu
await page.waitForFunction(() => (window.__truehandScene?.frames ?? 0) > 0, null, { timeout: 20000 })
await settle()
out.circuitAwaiting = { drawCalls: (await scene()).drawCalls, framesIn2s: await framesOver(2000) }
await page.getByRole('button', { name: 'Next recorded reading' }).click()
await page.getByTestId('warning-banner').waitFor()
await settle()
out.circuitAfterWarning = { drawCalls: (await scene()).drawCalls, framesIn2s: await framesOver(2000) }
await page.getByRole('button', { name: 'Next recorded reading' }).click()
await page.getByTestId('diagnosis').waitFor()
await settle()
out.circuitResolved = { drawCalls: (await scene()).drawCalls, framesIn2s: await framesOver(2000) }
await page.goto(BASE + '/sim?domain=thermometer&mode=replay&fixture=thermometer_demo')
await page.waitForFunction(() => (window.__truehandScene?.frames ?? 0) > 0, null, { timeout: 20000 })
await settle()
out.roastAwaiting = { drawCalls: (await scene()).drawCalls, framesIn2s: await framesOver(2000) }
await page.goto(BASE + '/')
await page.waitForFunction(() => (window.__truehandScene?.frames ?? 0) > 0, null, { timeout: 20000 })
await settle()
out.landingIdle = { drawCalls: (await scene()).drawCalls, framesIn2s: await framesOver(2000) }
console.log(JSON.stringify(out, null, 2))
await browser.close()
