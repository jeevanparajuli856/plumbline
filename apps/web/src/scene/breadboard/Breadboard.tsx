import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Instance, Instances } from '@react-three/drei'
import { BOARD, COLUMN_COUNT, RAIL_Z, columnX, holePositions } from '../layout'
import { useSceneTokens } from '../tokens'
import { box, mergeAll } from './geometry'

const HOLE_SIZE = 0.0012
const HOLE_LIFT = 0.00006
const STRIPE_WIDTH = 0.0006
const STRIPE_OFFSET = 0.0022
const HOLES = holePositions()

/** Slab, centre channel, rail stripes and every hole (one instanced draw call). */
export function Breadboard() {
  const tokens = useSceneTokens()
  const stripes = useMemo(() => {
    const pos = new THREE.Color(tokens.railPositive)
    const neg = new THREE.Color(tokens.railNegative)
    const length = columnX(COLUMN_COUNT - 2) - columnX(1)
    const parts = RAIL_Z.map((z) => {
      const outer = Math.abs(z) > Math.abs(RAIL_Z[1] ?? 0)
      const stripeZ = z + Math.sign(z) * (outer ? STRIPE_OFFSET : -STRIPE_OFFSET)
      // Far side: inner rail is ground (negative, blue); near side mirrors it.
      return box(
        [length, 0.0001, STRIPE_WIDTH],
        [0, BOARD.top + HOLE_LIFT, stripeZ],
        outer ? pos : neg,
      )
    })
    return mergeAll(parts)
  }, [tokens.railPositive, tokens.railNegative])
  useEffect(() => () => stripes.dispose(), [stripes])

  return (
    <group name="breadboard">
      <mesh name="slab" position={[0, BOARD.top - BOARD.thickness / 2, 0]} receiveShadow>
        <boxGeometry args={[BOARD.length, BOARD.thickness, BOARD.depth]} />
        <meshStandardMaterial color={tokens.sceneBoard} roughness={0.85} />
      </mesh>
      <mesh name="channel" position={[0, BOARD.top + HOLE_LIFT, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[BOARD.length - 0.004, BOARD.channelWidth]} />
        <meshStandardMaterial color={tokens.sceneHole} transparent opacity={0.35} roughness={1} />
      </mesh>
      <mesh name="rail-stripes" geometry={stripes}>
        <meshStandardMaterial vertexColors roughness={0.7} />
      </mesh>
      <Instances name="holes" limit={HOLES.length} range={HOLES.length}>
        <boxGeometry args={[HOLE_SIZE, 0.0001, HOLE_SIZE]} />
        <meshStandardMaterial color={tokens.sceneHole} roughness={1} />
        {HOLES.map((p, i) => (
          <Instance key={i} position={[p[0], p[1] + HOLE_LIFT, p[2]]} />
        ))}
      </Instances>
    </group>
  )
}
