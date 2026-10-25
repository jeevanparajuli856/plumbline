/**
 * Breadboard geometry in meters, derived from the circuit netlist in docs/ARCHITECTURE.md 5.1.
 * Pure: no React, no three. World axes: x along the board (columns), y up, z toward the camera.
 * Node rows sit on the a-e half; ground is the far inner rail; the probe touches lane e, the
 * hole nearest the camera, which no part leg uses.
 */
export type Vec3 = [number, number, number]
export type Lane = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j'
export type PartId = 'BAT' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7' | 'D1'
export type PartKind = 'battery' | 'resistor' | 'led'

export interface Terminal {
  site: number | 'gnd'
  lane: Lane | 'rail'
  column: number
}

export interface Part {
  id: PartId
  kind: PartKind
  a: Terminal
  b: Terminal
  /** Resistor value in ohms, for the colour bands. */
  ohms?: number
}

export const HOLE_PITCH = 0.00254
export const COLUMN_COUNT = 63
export const SITE_COUNT = 6
const FIRST_SITE_COLUMN = 16
const SITE_STRIDE_COLUMNS = 6
const CENTRE_COLUMN = (COLUMN_COUNT - 1) / 2

export const LANES: readonly Lane[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
/** Pitches from the board centre line to each lane; e and f flank the 0.3 inch channel. */
const LANE_PITCHES: Record<Lane, number> = {
  a: -5.5,
  b: -4.5,
  c: -3.5,
  d: -2.5,
  e: -1.5,
  f: 1.5,
  g: 2.5,
  h: 3.5,
  i: 4.5,
  j: 5.5,
}
const RAIL_PITCHES = [-9, -8, 8, 9] as const
const RAIL_FIRST_COLUMN = 2
const RAIL_LAST_COLUMN = 61
const RAIL_GAP_EVERY = 6

export const PROBE_LANE: Lane = 'e'

/** Frame drawn around a row's lanes a..e (told outline, landed fill). */
export const ROW_FRAME = {
  width: 3.4 * HOLE_PITCH,
  depth: 5.8 * HOLE_PITCH,
  centreZ: -3.5 * HOLE_PITCH,
} as const
export const GND_RAIL_Z = -8 * HOLE_PITCH

export const BOARD = {
  length: 0.165,
  depth: 0.055,
  thickness: 0.009,
  /** y of the top surface. */
  top: 0,
  channelWidth: 0.0026,
} as const

/** Off-board 9 V battery body centre, left of the board on the bench. */
export const BATTERY_CENTRE: Vec3 = [-0.112, 0.0085 - BOARD.thickness, -0.012]
export const BATTERY_SIZE: Vec3 = [0.026, 0.017, 0.046]

export function columnX(column: number): number {
  return (column - CENTRE_COLUMN) * HOLE_PITCH
}

export function siteColumn(site: number): number {
  return FIRST_SITE_COLUMN + site * SITE_STRIDE_COLUMNS
}

export function siteX(site: number): number {
  return columnX(siteColumn(site))
}

export function rowLaneZ(lane: Lane): number {
  return LANE_PITCHES[lane] * HOLE_PITCH
}

/** Where the probe tip touches a site, on the board surface. */
export function probeSitePosition(site: number, out: Vec3 = [0, 0, 0]): Vec3 {
  out[0] = siteX(site)
  out[1] = BOARD.top
  out[2] = rowLaneZ(PROBE_LANE)
  return out
}

function row(site: number, lane: Lane): Terminal {
  return { site, lane, column: siteColumn(site) }
}

function gnd(column: number): Terminal {
  return { site: 'gnd', lane: 'rail', column }
}

export const PARTS: readonly Part[] = [
  { id: 'BAT', kind: 'battery', a: row(0, 'c'), b: gnd(siteColumn(0) - 4) },
  { id: 'R1', kind: 'resistor', a: row(0, 'b'), b: row(1, 'b'), ohms: 1000 },
  { id: 'R2', kind: 'resistor', a: row(1, 'c'), b: row(2, 'c'), ohms: 2200 },
  { id: 'R3', kind: 'resistor', a: row(2, 'a'), b: gnd(siteColumn(2)), ohms: 2200 },
  { id: 'R4', kind: 'resistor', a: row(2, 'b'), b: row(5, 'b'), ohms: 4700 },
  { id: 'R5', kind: 'resistor', a: row(5, 'a'), b: gnd(siteColumn(5)), ohms: 4700 },
  { id: 'R6', kind: 'resistor', a: row(1, 'd'), b: row(3, 'd'), ohms: 330 },
  { id: 'D1', kind: 'led', a: row(3, 'c'), b: row(4, 'c') },
  { id: 'R7', kind: 'resistor', a: row(4, 'a'), b: gnd(siteColumn(4)), ohms: 100 },
]

export function terminalPosition(t: Terminal): Vec3 {
  const z = t.lane === 'rail' ? GND_RAIL_Z : rowLaneZ(t.lane)
  return [columnX(t.column), BOARD.top, z]
}

export function partById(id: PartId): Part {
  const part = PARTS.find((p) => p.id === id)
  if (!part) throw new Error(`Unknown part ${id}`)
  return part
}

export function partRows(id: PartId): number[] {
  const { a, b } = partById(id)
  return [a.site, b.site].filter((s): s is number => s !== 'gnd')
}

/** Where the plumb line rests for a part: over its body. */
export function partCenter(id: PartId): Vec3 {
  if (id === 'BAT') return [...BATTERY_CENTRE]
  const { a, b } = partById(id)
  const pa = terminalPosition(a)
  const pb = terminalPosition(b)
  return [(pa[0] + pb[0]) / 2, BOARD.top, (pa[2] + pb[2]) / 2]
}

const HYPOTHESIS_PREFIX_TO_PART: Record<string, PartId> = {
  R1: 'R1',
  R2: 'R2',
  R3: 'R3',
  R4: 'R4',
  R5: 'R5',
  R6: 'R6',
  R7: 'R7',
  LED: 'D1',
  battery: 'BAT',
}

/** The part a hypothesis blames, from the catalog id scheme (`R3_10x_low`, `LED_open`, `battery_low`). */
export function partForHypothesis(id: string): PartId | null {
  const prefix = id.split('_')[0] ?? ''
  return HYPOTHESIS_PREFIX_TO_PART[prefix] ?? null
}

/** Every hole on the board: 63 columns x 10 lanes plus four rails of 50 in groups of five. */
export function holePositions(): Vec3[] {
  const holes: Vec3[] = []
  for (let c = 0; c < COLUMN_COUNT; c++) {
    for (const lane of LANES) holes.push([columnX(c), BOARD.top, rowLaneZ(lane)])
  }
  for (const pitch of RAIL_PITCHES) {
    for (let c = RAIL_FIRST_COLUMN; c <= RAIL_LAST_COLUMN; c++) {
      if (c % RAIL_GAP_EVERY === 0) continue
      holes.push([columnX(c), BOARD.top, pitch * HOLE_PITCH])
    }
  }
  return holes
}

export const RAIL_Z = RAIL_PITCHES.map((p) => p * HOLE_PITCH)
