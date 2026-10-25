import type * as THREE from 'three'
import { addAfterEffect, addEffect } from '@react-three/fiber'

export interface ScenePerfStats {
  /** renderer.info.render.calls summed over every render pass of the last frame. */
  drawCalls: number
  /** Frames actually rendered since mount; flat while idle in demand mode. */
  frames: number
}

declare global {
  interface Window {
    __truehandScene?: ScenePerfStats
  }
}

export const EXPOSE_PERF = import.meta.env.DEV || import.meta.env.MODE === 'test'

/**
 * Exposes draw calls and a frame counter on window.__truehandScene (dev and test only).
 * autoReset is switched off so shadow and ContactShadows passes count toward the total.
 */
export function startPerfProbe(gl: THREE.WebGLRenderer): () => void {
  const stats: ScenePerfStats = { drawCalls: 0, frames: 0 }
  window.__truehandScene = stats
  gl.info.autoReset = false
  let lastFrame = gl.info.render.frame
  const stopBefore = addEffect(() => gl.info.reset())
  const stopAfter = addAfterEffect(() => {
    if (gl.info.render.frame === lastFrame) return
    lastFrame = gl.info.render.frame
    stats.drawCalls = gl.info.render.calls
    stats.frames += 1
  })
  return () => {
    stopBefore()
    stopAfter()
    gl.info.autoReset = true
    delete window.__truehandScene
  }
}
