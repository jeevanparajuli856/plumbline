import { ContactShadows } from '@react-three/drei'
import { BOARD } from './layout'
import { useSceneTokens } from './tokens'

const SHADOW_EXTENT = 0.14

/** Key (the only shadow caster, 1024 map), fill and rim. No HDR, nothing fetched. */
export function Lights() {
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight
        name="key-light"
        position={[0.12, 0.3, 0.18]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-SHADOW_EXTENT}
        shadow-camera-right={SHADOW_EXTENT}
        shadow-camera-top={SHADOW_EXTENT}
        shadow-camera-bottom={-SHADOW_EXTENT}
        shadow-camera-near={0.05}
        shadow-camera-far={0.7}
        shadow-bias={-0.0004}
        shadow-normalBias={0.0004}
      />
      <directionalLight name="fill-light" position={[-0.25, 0.15, 0.12]} intensity={0.6} />
      <directionalLight name="rim-light" position={[0, 0.12, -0.3]} intensity={0.9} />
    </>
  )
}

/**
 * Soft shadow of the board on the bench, rendered once (frames=1) so idle frames stay free.
 * Lives in the circuit group so it crossfades with it; the roast sits on another layer.
 */
export function BenchShadow() {
  const tokens = useSceneTokens()
  return (
    <ContactShadows
      position={[0, BOARD.top - BOARD.thickness - 0.0002, 0]}
      scale={0.4}
      resolution={512}
      blur={2.4}
      far={0.04}
      opacity={0.45}
      frames={1}
      color={tokens.text}
    />
  )
}
