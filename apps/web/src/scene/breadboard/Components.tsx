import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import {
  BATTERY_CENTRE,
  BATTERY_SIZE,
  GND_RAIL_Z,
  PARTS,
  columnX,
  terminalPosition,
  type Part,
  type Vec3,
} from '../layout'
import { BAND_HSL, resistorBands } from '../resistorBands'
import { useSceneTokens } from '../tokens'
import { BODY_LENGTH, BODY_Y, bodyPose, type BodyPose } from './bodyPose'
import { box, mergeAll, polyline, segment } from './geometry'

/** Body heights and sizes in meters; resistors ride above the holes so long leads can bend. */
const BODY_RADIUS = 0.0011
const LEG_RADIUS = 0.00028
const WIRE_RADIUS = 0.0006
const WIRE_HEIGHT = 0.009
const LEG_DEPTH = -0.0015
const BAND_WIDTH = 0.0006
const BAND_POSITIONS = [-0.0018, -0.0008, 0.0002] as const
const LED_BASE_Y = 0.005
const LED_RADIUS = 0.0025
const LED_HEIGHT = 0.0045
const CLIP_COLUMN = 56

const RESISTORS = PARTS.filter((p) => p.kind === 'resistor')
const LED = PARTS.find((p) => p.kind === 'led')!
const BATTERY = PARTS.find((p) => p.kind === 'battery')!
const BATTERY_SNAP_X = BATTERY_CENTRE[0] + BATTERY_SIZE[0] / 2
const BATTERY_SNAP_Y = BATTERY_CENTRE[1] + 0.003
const SNAP_SPREAD = 0.0064

function legPaths(part: Part, pose: BodyPose, top: number): Vec3[][] {
  const a = terminalPosition(part.a)
  const b = terminalPosition(part.b)
  return [
    [[a[0], LEG_DEPTH, a[2]], [a[0], top, a[2]], pose.start],
    [[b[0], LEG_DEPTH, b[2]], [b[0], top, b[2]], pose.end],
  ]
}

function batteryWires(red: THREE.Color, black: THREE.Color): THREE.BufferGeometry[] {
  const plus = terminalPosition(BATTERY.a)
  const minus = terminalPosition(BATTERY.b)
  const route = (snapZ: number, to: Vec3): Vec3[] => [
    [BATTERY_SNAP_X, BATTERY_SNAP_Y, snapZ],
    [BATTERY_SNAP_X + 0.008, WIRE_HEIGHT, snapZ],
    [to[0], WIRE_HEIGHT, to[2]],
    [to[0], LEG_DEPTH, to[2]],
  ]
  return [
    ...polyline(route(BATTERY_CENTRE[2] - SNAP_SPREAD, plus), WIRE_RADIUS, red),
    ...polyline(route(BATTERY_CENTRE[2] + SNAP_SPREAD, minus), WIRE_RADIUS, black),
  ]
}

/** Black meter lead clipped to the ground rail, cable leaving the board to the right. */
function blackLead(black: THREE.Color, metal: THREE.Color): THREE.BufferGeometry[] {
  const x = columnX(CLIP_COLUMN)
  return [
    segment([x, LEG_DEPTH, GND_RAIL_Z], [x, 0.003, GND_RAIL_Z], LEG_RADIUS * 1.6, metal),
    box([0.004, 0.0035, 0.009], [x, 0.0048, GND_RAIL_Z + 0.002], black),
    ...polyline(
      [
        [x, 0.0048, GND_RAIL_Z + 0.0065],
        [x + 0.01, 0.006, GND_RAIL_Z + 0.02],
        [x + 0.03, 0.004, 0.035],
        [x + 0.05, -0.006, 0.06],
      ],
      0.0012,
      black,
    ),
  ]
}

function useStaticClutter(): THREE.BufferGeometry {
  const t = useSceneTokens()
  const geometry = useMemo(() => {
    const metal = new THREE.Color(t.metal)
    const legs = RESISTORS.flatMap((part) => legPaths(part, bodyPose(part), BODY_Y)).concat(
      legPaths(LED, bodyPose(LED, LED_BASE_Y, 0.00254), LED_BASE_Y),
    )
    return mergeAll([
      ...legs.flatMap((path) => polyline(path, LEG_RADIUS, metal)),
      ...batteryWires(new THREE.Color(t.probe), new THREE.Color(t.lead)),
      ...blackLead(new THREE.Color(t.lead), metal),
    ])
  }, [t.metal, t.probe, t.lead])
  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}

function ResistorBodies() {
  const tokens = useSceneTokens()
  const bodies = useRef<THREE.InstancedMesh>(null)
  const bands = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const colour = new THREE.Color()
    RESISTORS.forEach((part, i) => {
      const pose = bodyPose(part)
      q.setFromEuler(e.set(0, pose.yaw, Math.PI / 2))
      m.compose(new THREE.Vector3(...pose.centre), q, new THREE.Vector3(1, pose.length, 1))
      bodies.current?.setMatrixAt(i, m)
      resistorBands(part.ohms ?? 0).forEach((band, k) => {
        const along = BAND_POSITIONS[k]! * (pose.length / BODY_LENGTH)
        const c = Math.cos(pose.yaw)
        const s = -Math.sin(pose.yaw)
        const at = new THREE.Vector3(pose.centre[0] + c * along, BODY_Y, pose.centre[2] + s * along)
        m.compose(at, q, new THREE.Vector3(1, 1, 1))
        bands.current?.setMatrixAt(i * 3 + k, m)
        bands.current?.setColorAt(i * 3 + k, colour.set(BAND_HSL[band]))
      })
    })
    if (bodies.current) bodies.current.instanceMatrix.needsUpdate = true
    if (bands.current) {
      bands.current.instanceMatrix.needsUpdate = true
      if (bands.current.instanceColor) bands.current.instanceColor.needsUpdate = true
    }
  }, [])
  return (
    <>
      <instancedMesh
        ref={bodies}
        name="resistor-bodies"
        args={[undefined, undefined, RESISTORS.length]}
        castShadow
      >
        <cylinderGeometry args={[BODY_RADIUS, BODY_RADIUS, 1, 12]} />
        <meshStandardMaterial color={tokens.resistor} roughness={0.6} />
      </instancedMesh>
      <instancedMesh
        ref={bands}
        name="resistor-bands"
        args={[undefined, undefined, RESISTORS.length * 3]}
      >
        <cylinderGeometry args={[BODY_RADIUS * 1.06, BODY_RADIUS * 1.06, BAND_WIDTH, 12]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
    </>
  )
}

function Led() {
  const tokens = useSceneTokens()
  const pose = bodyPose(LED, LED_BASE_Y, 0.00254)
  return (
    <group name="led" position={[pose.centre[0], LED_BASE_Y, pose.centre[2]]}>
      <mesh position-y={LED_HEIGHT / 2} castShadow>
        <cylinderGeometry args={[LED_RADIUS, LED_RADIUS * 1.12, LED_HEIGHT, 20]} />
        <meshStandardMaterial color={tokens.led} roughness={0.25} transparent opacity={0.9} />
      </mesh>
      <mesh position-y={LED_HEIGHT}>
        <sphereGeometry args={[LED_RADIUS, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={tokens.led} roughness={0.25} transparent opacity={0.9} />
      </mesh>
    </group>
  )
}

function Battery() {
  const tokens = useSceneTokens()
  return (
    <group name="battery">
      <mesh position={BATTERY_CENTRE} castShadow receiveShadow>
        <boxGeometry args={BATTERY_SIZE} />
        <meshStandardMaterial color={tokens.battery} roughness={0.5} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[
            BATTERY_SNAP_X + 0.001,
            BATTERY_SNAP_Y,
            BATTERY_CENTRE[2] + side * SNAP_SPREAD,
          ]}
          rotation-z={Math.PI / 2}
        >
          <cylinderGeometry args={[0.0028, 0.0028, 0.002, 12]} />
          <meshStandardMaterial color={tokens.metal} metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
    </group>
  )
}

/** Battery, R1 to R7 and the LED on their netlist rows, plus merged legs, wires and black lead. */
export function Components() {
  const clutter = useStaticClutter()
  return (
    <group name="components">
      <mesh name="legs-and-wires" geometry={clutter} castShadow>
        <meshStandardMaterial vertexColors roughness={0.45} metalness={0.2} />
      </mesh>
      <ResistorBodies />
      <Led />
      <Battery />
    </group>
  )
}
