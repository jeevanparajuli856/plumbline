import { Canvas } from '@react-three/fiber'
import { SceneUnavailable } from './SceneUnavailable'

/**
 * The single app-level Canvas. Sprint 0 placeholder: a lit breadboard slab in the light theme.
 * The scene lane replaces the contents; the Canvas props and the `fallback` are the contract.
 */
export default function SceneRoot() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      shadows
      frameloop="demand"
      camera={{ fov: 35, near: 0.01, far: 5, position: [0.18, 0.22, 0.28] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      fallback={<SceneUnavailable />}
      onCreated={({ gl, camera }) => {
        gl.setClearColor(readToken('--scene-bg', '#f6f3ec'))
        camera.lookAt(0, 0, 0)
      }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[0.3, 0.6, 0.4]} intensity={1.6} castShadow shadow-mapSize={1024} />
      <mesh name="breadboard" receiveShadow>
        <boxGeometry args={[0.165, 0.009, 0.055]} />
        <meshStandardMaterial color={readToken('--scene-board', '#d9d3c6')} />
      </mesh>
    </Canvas>
  )
}

function readToken(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}
