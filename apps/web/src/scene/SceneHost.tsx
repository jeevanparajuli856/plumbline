import { lazy, Suspense, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { webglSupported } from '@/lib/webgl'
import { useLanding } from '@/state/landing'
import { usePrefs } from '@/state/prefs'
import { useSession } from '@/state/session'
import { SceneUnavailable } from './SceneUnavailable'
import { sceneLabel } from './sceneLabel'
import { useSceneSlot } from './useSceneSlot'

const SceneRoot = lazy(() => import('./SceneRoot'))

function SceneFrame() {
  const label = useSession((s) =>
    sceneLabel({
      domain: s.domain,
      sites: s.catalog?.sites ?? [],
      aimedSite: s.aimedSite,
      readings: s.readings,
    }),
  )
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
  // Once the Canvas has mounted it stays mounted (off the page while no container shows it), so
  // React never deletes the portal mid route change and the WebGL context survives navigation.
  const [hasMounted, setHasMounted] = useState(false)
  // Remembering that a container existed is state derived from render, set during render.
  if (container !== null && !hasMounted) setHasMounted(true)
  const keepCanvas = hasWebgl && !textOnly && (hasMounted || container !== null)

  useLayoutEffect(() => {
    if (!container || !host) return
    container.appendChild(host)
    return () => host.remove()
  }, [container, host])

  if (!host || (!enabled && !keepCanvas)) return null
  const content = hasWebgl ? <SceneFrame /> : sceneMode === 'sim' ? <SceneUnavailable /> : null
  const showPortal = hasWebgl ? keepCanvas : container !== null
  return (
    <>
      {sceneMode === 'landing' && !textOnly && (
        // Decorative backdrop on the landing: its captions carry the content, and a labelled
        // image outside any landmark would trip axe's region rule.
        <div
          ref={setLayer}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        />
      )}
      {showPortal && content && createPortal(content, host)}
    </>
  )
}
