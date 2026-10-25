import { lazy, Suspense } from 'react'
import { webglSupported } from '@/lib/webgl'
import { useLanding } from '@/state/landing'
import { usePrefs } from '@/state/prefs'
import { SceneUnavailable } from './SceneUnavailable'

const SceneRoot = lazy(() => import('./SceneRoot'))

/** Lazy boundary around the one Canvas. Never loads three when WebGL is missing or text-only is on. */
export function SceneHost() {
  const sceneMode = useLanding((s) => s.sceneMode)
  const textOnly = usePrefs((s) => s.textOnly)
  if (sceneMode === 'hidden') return null
  if (textOnly) return null
  if (!webglSupported()) return <SceneUnavailable />
  return (
    <div
      role="img"
      aria-label="3D view of the breadboard. All information is also in the text channel."
      className="absolute inset-0 -z-0"
    >
      <Suspense fallback={null}>
        <SceneRoot />
      </Suspense>
    </div>
  )
}
