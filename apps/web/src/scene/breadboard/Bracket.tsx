import { useShallow } from 'zustand/react/shallow'
import { useReducedMotion } from '@/a11y/useReducedMotion'
import { useSession } from '@/state/session'
import { BOARD, HOLE_PITCH, ROW_FRAME, siteX } from '../layout'
import { bracketRows } from '../selectors'
import { useSceneTokens } from '../tokens'

/** The bracket runs along the far edge of the row frames. */
const BRACKET_Z = ROW_FRAME.centreZ - ROW_FRAME.depth / 2 - 1.2 * HOLE_PITCH
const BAR = 0.0008
const TICK = 0.004
const LIFT = 0.0004
/** Static spread drawn instead of motion when the OS asks for reduced motion. */
export function Bracket() {
  const reduced = useReducedMotion()
  const tokens = useSceneTokens()
  const rows = useSession(useShallow(bracketRows))
  if (!reduced || !rows) return null
  const left = siteX(rows[0]) - ROW_FRAME.width / 2
  const right = siteX(rows[1]) + ROW_FRAME.width / 2
  const y = BOARD.top + LIFT
  return (
    <group name="bracket">
      <mesh position={[(left + right) / 2, y, BRACKET_Z]}>
        <boxGeometry args={[right - left, 0.0002, BAR]} />
        <meshBasicMaterial color={tokens.inferred} toneMapped={false} />
      </mesh>
      {[left, right].map((x) => (
        <mesh key={x} position={[x, y, BRACKET_Z + TICK / 2]}>
          <boxGeometry args={[BAR, 0.0002, TICK]} />
          <meshBasicMaterial color={tokens.inferred} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}
