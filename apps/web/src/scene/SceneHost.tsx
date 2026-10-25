import { lazy, Suspense, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { webglSupported } from '@/lib/webgl'
import { useLanding } from '@/state/landing'
import { usePrefs } from '@/state/prefs'
import { useSession } from '@/state/session'
import { SceneUnavailable } from './SceneUnavailable'
import { useSceneSlot } from './useSceneSlot'

const SceneRoot = lazy(() => import('./SceneRoot'))

function SceneFrame() {
  const domain = useSession((s) => s.domain)
  const label =
    domain === 'thermometer'
      ? '3D cross-section of the simulated roast and thermometer. All information is also in the text channel.'
      : '3D view of the breadboard and probe. All information is also in the text channel.'
  return (
    <div role="img" aria-label={label} data-testid="scene" className="h-full w-full">
      <Suspense fallback={null}>
        <SceneRoot />
      </Suspense>
    </div>
  )
}

/**
 * Mounting seam (docs/UI_CONTRACT.md 3). The Canvas renders into one detached host element that
 * is moved, not re-rendered: into a fixed full-viewport layer on the landing, into #scene-slot
 * in the sim. Moving the node keeps the WebGL context, so the camera flies between poses
 * instead of remounting. No slot in sim mode (text-only view) means nothing mounts.
 */
export function SceneHost() {
  const sceneMode = useLanding((s) => s.sceneMode)
  const textOnly = usePrefs((s) => s.textOnly)
  const slot = useSceneSlot(sceneMode === 'sim')
  const [layer, setLayer] = useState<HTMLDivElement | null>(null)
  const [host] = useState(() =>
    typeof document === 'undefined'
      ? null
      : Object.assign(document.createElement('div'), {
          className: 'h-full w-full',
        }),
  )
  const [hasWebgl] = useState(webglSupported)

  const enabled = !textOnly && sceneMode !== 'hidden'
  const container = !enabled ? null : sceneMode === 'sim' ? slot : layer

  useLayoutEffect(() => {
    if (!container || !host) return
    container.appendChild(host)
    return () => host.remove()
  }, [container, host])

  if (!enabled || !host) return null
  const content = hasWebgl ? <SceneFrame /> : sceneMode === 'sim' ? <SceneUnavailable /> : null
  return (
    <>
      {sceneMode === 'landing' && (
        <div ref={setLayer} className="pointer-events-none fixed inset-0 z-0" />
      )}
      {container && content && createPortal(content, host)}
    </>
  )
}
