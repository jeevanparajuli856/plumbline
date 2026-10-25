import type { ThreeEvent } from '@react-three/fiber'
import { useSession } from '@/state/session'
import { restoreCursor, setPointerCursor } from '../cursor'
import { DEPTH_SITES_CM, ROAST_RADIUS, depthPosition } from '../roastLayout'

const BOX: [number, number, number] = [ROAST_RADIUS / 6, 0.02, 0.012]

/** Invisible click targets per depth band on the cut face; clicking aims the thermometer. */
export function DepthHitboxes() {
  const aimProbe = useSession((s) => s.aimProbe)
  return (
    <group name="depth-hitboxes">
      {DEPTH_SITES_CM.map((_, site) => (
        <mesh
          key={site}
          name={`depth-hitbox-${site + 1}`}
          visible={false}
          position={depthPosition(site)}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation()
            aimProbe(site)
          }}
          onPointerOver={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation()
            setPointerCursor()
          }}
          onPointerOut={restoreCursor}
        >
          <boxGeometry args={BOX} />
          <meshBasicMaterial />
        </mesh>
      ))}
    </group>
  )
}
