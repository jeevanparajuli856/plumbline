import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useSession, setSceneMounted } from '@/state/session'
import { EXPOSE_PERF, startPerfProbe } from './perfProbe'

/** Tells the store a scene can animate reveals, and re-renders on store changes in demand mode. */
export function SceneLifecycle() {
  const invalidate = useThree((s) => s.invalidate)
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    setSceneMounted(true)
    return () => setSceneMounted(false)
  }, [])
  useEffect(() => useSession.subscribe(() => invalidate()), [invalidate])
  useEffect(() => (EXPOSE_PERF && gl.info ? startPerfProbe(gl) : undefined), [gl])
  return null
}
