import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useSession } from '@/state/session'
import { BOARD, ROW_FRAME, siteX } from '../layout'
import { livePose } from '../livePose'
import { landedSite, toldSite, warningSite } from '../selectors'
import { useSceneTokens } from '../tokens'
import { box, mergeAll, rectFrame } from './geometry'

const DASH = 0.0013
const GAP = 0.0008
const DASH_THICKNESS = 0.0005
const SOLID_THICKNESS = 0.0009
const EDGE_THICKNESS = 0.0004
const LIFT = 0.0003
/** How far the hand-confusion plane rises when the landing explodes the layers. */
const HAND_PLANE_RISE = 0.025
const WHITE = new THREE.Color(1, 1, 1)

function dashedEdge(length: number, horizontal: boolean, offset: number): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = []
  for (let s = -length / 2; s + DASH <= length / 2 + 1e-9; s += DASH + GAP) {
    const c = s + DASH / 2
    parts.push(
      horizontal
        ? box([DASH, 0.0001, DASH_THICKNESS], [c, 0, offset], WHITE)
        : box([DASH_THICKNESS, 0.0001, DASH], [offset, 0, c], WHITE),
    )
  }
  return parts
}

/** Dashed = instructed (inferred, outlined). Built once, shared. */
const DASHED_FRAME = mergeAll([
  ...dashedEdge(ROW_FRAME.width, true, -ROW_FRAME.depth / 2),
  ...dashedEdge(ROW_FRAME.width, true, ROW_FRAME.depth / 2),
  ...dashedEdge(ROW_FRAME.depth, false, -ROW_FRAME.width / 2),
  ...dashedEdge(ROW_FRAME.depth, false, ROW_FRAME.width / 2),
])

/** Solid and heavier = warning, so the change is shape as well as colour. */
const SOLID_FRAME = rectFrame(ROW_FRAME.width, ROW_FRAME.depth, SOLID_THICKNESS)
/** Thin edge on the landed fill: the amber body is 1.3:1 on the light board, the edge 3:1+. */
const LANDED_EDGE = rectFrame(ROW_FRAME.width - 0.001, ROW_FRAME.depth - 0.001, EDGE_THICKNESS)

/** Told row outline (cyan dashed, vermilion solid on warning) and the landed row fill (amber). */
export function NoisyHand() {
  const tokens = useSceneTokens()
  const told = useSession(toldSite)
  const warned = useSession(warningSite)
  const landed = useSession(landedSite)
  const handPlane = useRef<THREE.Group>(null)

  useFrame(() => {
    if (handPlane.current) handPlane.current.position.y = livePose.explode * HAND_PLANE_RISE
  })

  const dashedSite = told !== null && told !== warned ? told : null
  return (
    <group name="noisy-hand">
      <group ref={handPlane} name="hand-plane">
        <mesh
          name="told-outline"
          geometry={DASHED_FRAME}
          visible={dashedSite !== null}
          position={[siteX(dashedSite ?? 0), BOARD.top + LIFT, ROW_FRAME.centreZ]}
        >
          <meshBasicMaterial color={tokens.inferred} toneMapped={false} />
        </mesh>
        <mesh
          name="warning-outline"
          geometry={SOLID_FRAME}
          visible={warned !== null}
          position={[siteX(warned ?? 0), BOARD.top + LIFT * 1.5, ROW_FRAME.centreZ]}
        >
          <meshBasicMaterial color={tokens.warning} toneMapped={false} />
        </mesh>
      </group>
      <mesh
        name="landed-fill"
        visible={landed !== null}
        position={[siteX(landed ?? 0), BOARD.top + LIFT * 0.5, ROW_FRAME.centreZ]}
        rotation-x={-Math.PI / 2}
      >
        <planeGeometry args={[ROW_FRAME.width - 0.001, ROW_FRAME.depth - 0.001]} />
        <meshBasicMaterial
          color={tokens.measuredFill}
          transparent
          opacity={0.6}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>
      <mesh
        name="landed-edge"
        geometry={LANDED_EDGE}
        visible={landed !== null}
        position={[siteX(landed ?? 0), BOARD.top + LIFT, ROW_FRAME.centreZ]}
      >
        <meshBasicMaterial color={tokens.measured} toneMapped={false} />
      </mesh>
    </group>
  )
}
