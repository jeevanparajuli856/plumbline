import type { ThreeEvent } from '@react-three/fiber'
import { useSession } from '@/state/session'
import { HOLE_PITCH, SITE_COUNT, siteX } from '../layout'
import { restoreCursor, setPointerCursor } from '../cursor'

const BOX: [number, number, number] = [5 * HOLE_PITCH, 0.008, 12 * HOLE_PITCH]
const SITES = Array.from({ length: SITE_COUNT }, (_, i) => i)

/**
 * Invisible click targets over each row. `visible={false}` hides them from the renderer but the
 * raycaster still hits them; a test pins that. Clicking aims the probe; nothing else.
 */
export function RowHitboxes() {
  const aimProbe = useSession((s) => s.aimProbe)
  return (
    <group name="row-hitboxes">
      {SITES.map((site) => (
        <mesh
          key={site}
          name={`row-hitbox-${site + 1}`}
          visible={false}
          position={[siteX(site), BOX[1] / 2, 0]}
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
