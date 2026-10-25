import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { colourise, mergeAll } from '../breadboard/geometry'
import { DEPTH_SITES_CM, ROAST_RADIUS, bandRadii } from '../roastLayout'
import { useSceneTokens } from '../tokens'

const RING_SEGMENTS = 64
const SHELL_SEGMENTS = 40

/** Cut face: six concentric 1 cm bands, crust to centre, merged into one vertex-coloured mesh. */
function useBandGeometry(): THREE.BufferGeometry {
  const t = useSceneTokens()
  const geometry = useMemo(() => {
    const crust = new THREE.Color(t.roastCrust)
    const centre = new THREE.Color(t.roastCentre)
    const last = DEPTH_SITES_CM.length - 1
    return mergeAll(
      DEPTH_SITES_CM.map((_, i) => {
        const [inner, outer] = bandRadii(i)
        const ring =
          inner > 0
            ? new THREE.RingGeometry(inner, outer, RING_SEGMENTS)
            : new THREE.CircleGeometry(outer, RING_SEGMENTS)
        return colourise(ring, crust.clone().lerp(centre, i / last))
      }),
    )
  }, [t.roastCrust, t.roastCentre])
  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}

/** Sliced sphere: back half-shell plus the banded cut face looking at the camera. */
export function DepthBands() {
  const tokens = useSceneTokens()
  const bands = useBandGeometry()
  return (
    <group name="depth-bands">
      <mesh name="roast-shell" castShadow>
        <sphereGeometry
          args={[ROAST_RADIUS, SHELL_SEGMENTS, SHELL_SEGMENTS / 2, Math.PI, Math.PI]}
        />
        <meshStandardMaterial color={tokens.roastCrust} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh name="roast-face" geometry={bands}>
        <meshStandardMaterial vertexColors roughness={0.95} />
      </mesh>
    </group>
  )
}
