import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useLanding } from '@/state/landing'
import { useSession, setSceneMounted } from '@/state/session'
import { EXPOSE_PERF, startPerfProbe } from './perfProbe'

/** Tells the store a scene can animate reveals, and re-renders on store changes in demand mode. */
export function SceneLifecycle() {
  const invalidate = useThree((s) => s.invalidate)
  const gl = useThree((s) => s.gl)
  // The store waits for a reveal animation only while the scene is actually on a page.
  const onPage = useLanding((s) => s.sceneMode !== 'hidden')
  useEffect(() => {
    setSceneMounted(onPage)
    return () => setSceneMounted(false)
  }, [onPage])
  useEffect(() => useSession.subscribe(() => invalidate()), [invalidate])
  useEffect(() => (EXPOSE_PERF && gl.info ? startPerfProbe(gl) : undefined), [gl])
  return null
}
