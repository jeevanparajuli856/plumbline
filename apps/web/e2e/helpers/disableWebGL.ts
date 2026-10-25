import type { BrowserContext, Page } from '@playwright/test'

/** Makes every WebGL context request fail before any app script runs, like a GPU-less machine. */
export async function disableWebGL(target: Page | BrowserContext): Promise<void> {
  await target.addInitScript(() => {
    const webgl = new Set(['webgl', 'webgl2', 'experimental-webgl'])
    const original = HTMLCanvasElement.prototype.getContext
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: function getContext(this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
        if (webgl.has(kind)) return null
        return (original as (...args: unknown[]) => unknown).call(this, kind, ...rest)
      },
    })
    if (typeof OffscreenCanvas !== 'undefined') {
      const offscreen = OffscreenCanvas.prototype.getContext
      Object.defineProperty(OffscreenCanvas.prototype, 'getContext', {
        configurable: true,
        value: function getContext(this: OffscreenCanvas, kind: string, ...rest: unknown[]) {
          if (webgl.has(kind)) return null
          return (offscreen as (...args: unknown[]) => unknown).call(this, kind, ...rest)
        },
      })
    }
  })
}
