import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Vec3 } from '../layout'

/**
 * Builders for merged, vertex-coloured geometry so static clutter (legs, wires, rail stripes)
 * costs one draw call. Callers own disposal of what they build (useMemo + cleanup effect).
 */
const UP = new THREE.Vector3(0, 1, 0)

export function colourise(
  geometry: THREE.BufferGeometry,
  colour: THREE.Color,
): THREE.BufferGeometry {
  const count = geometry.getAttribute('position').count
  const data = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    data[i * 3] = colour.r
    data[i * 3 + 1] = colour.g
    data[i * 3 + 2] = colour.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(data, 3))
  return geometry
}

/** A cylinder from a to b. */
export function segment(
  a: Vec3,
  b: Vec3,
  radius: number,
  colour: THREE.Color,
): THREE.BufferGeometry {
  const start = new THREE.Vector3(...a)
  const end = new THREE.Vector3(...b)
  const dir = end.clone().sub(start)
  const length = Math.max(dir.length(), 1e-6)
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 8, 1, false)
  const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize())
  const matrix = new THREE.Matrix4().compose(
    start.add(end).multiplyScalar(0.5),
    quat,
    new THREE.Vector3(1, 1, 1),
  )
  geometry.applyMatrix4(matrix)
  return colourise(geometry, colour)
}

/** Consecutive segments through the points, with a small sphere at each bend. */
export function polyline(
  points: Vec3[],
  radius: number,
  colour: THREE.Color,
): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i + 1 < points.length; i++) {
    parts.push(segment(points[i]!, points[i + 1]!, radius, colour))
    if (i > 0) {
      const joint = new THREE.SphereGeometry(radius, 8, 6)
      joint.translate(...points[i]!)
      parts.push(colourise(joint, colour))
    }
  }
  return parts
}

export function box(size: Vec3, centre: Vec3, colour: THREE.Color): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(...size)
  geometry.translate(...centre)
  return colourise(geometry, colour)
}

/** Merge and dispose the inputs. All inputs must carry position, normal, uv and color. */
export function mergeAll(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const indexed = parts.map((g) => (g.index ? g.toNonIndexed() : g))
  const merged = mergeGeometries(indexed, false)
  parts.forEach((g) => g.dispose())
  indexed.forEach((g) => g.dispose())
  if (!merged) throw new Error('mergeGeometries failed: attribute sets differ')
  return merged
}
