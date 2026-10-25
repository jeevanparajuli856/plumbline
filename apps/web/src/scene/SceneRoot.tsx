import { Canvas } from '@react-three/fiber'
import { SIM_POSE } from '@/landing/choreography'
import { ROAST_LAYER } from './livePose'
import { SceneContent } from './SceneContent'
import { SceneUnavailable } from './SceneUnavailable'
import { useSceneTokens } from './tokens'
import { useAnimating } from './useAnimating'

/**
 * The single app-level Canvas. Demand frameloop, switched to `always` only while a lease from
 * useAnimating is held (tremor, reveal), so it idles at 0 fps.
 */
export default function SceneRoot() {
  const animating = useAnimating()
  const tokens = useSceneTokens()
  return (
    <Canvas
      dpr={[1, 1.75]}
      shadows
      frameloop={animating ? 'always' : 'demand'}
      camera={{ fov: SIM_POSE.fov, near: 0.01, far: 5, position: [...SIM_POSE.camera] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      fallback={<SceneUnavailable />}
      onCreated={({ camera, raycaster }) => {
        camera.layers.enable(ROAST_LAYER)
        raycaster.layers.enableAll()
        camera.lookAt(...SIM_POSE.target)
      }}
    >
      <color attach="background" args={[tokens.sceneBg]} />
      <SceneContent />
    </Canvas>
  )
}
