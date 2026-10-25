import { describe, expect, it } from 'vitest'
import {
  BOARD,
  COLUMN_COUNT,
  GND_RAIL_Z,
  HOLE_PITCH,
  PARTS,
  PROBE_LANE,
  SITE_COUNT,
  columnX,
  holePositions,
  partCenter,
  partForHypothesis,
  partRows,
  rowLaneZ,
  siteColumn,
  siteX,
  terminalPosition,
} from './layout'

const MM = 0.001

describe('layout', () => {
  it('uses the 2.54 mm hole pitch in meters', () => {
    expect(HOLE_PITCH).toBeCloseTo(2.54 * MM, 12)
  })

  it('centres the 63 columns on x = 0', () => {
    expect(COLUMN_COUNT).toBe(63)
    expect(columnX(31)).toBeCloseTo(0, 12)
    expect(columnX(0)).toBeCloseTo(-31 * 2.54 * MM, 12)
    expect(columnX(62)).toBeCloseTo(31 * 2.54 * MM, 12)
  })

  it('places the six sites six columns apart, symmetric about the centre', () => {
    expect(SITE_COUNT).toBe(6)
    expect([0, 1, 2, 3, 4, 5].map(siteColumn)).toEqual([16, 22, 28, 34, 40, 46])
    expect(siteX(0)).toBeCloseTo(-38.1 * MM, 9)
    expect(siteX(2)).toBeCloseTo(-7.62 * MM, 9)
    expect(siteX(5)).toBeCloseTo(38.1 * MM, 9)
    expect(siteX(0) + siteX(5)).toBeCloseTo(0, 12)
  })

  it('maps hole lanes a..e to z = -5.5..-1.5 pitches, e nearest the camera', () => {
    expect(rowLaneZ('a')).toBeCloseTo(-5.5 * 2.54 * MM, 12)
    expect(rowLaneZ('e')).toBeCloseTo(-1.5 * 2.54 * MM, 12)
    expect(rowLaneZ('f')).toBeCloseTo(1.5 * 2.54 * MM, 12)
    expect(rowLaneZ('j')).toBeCloseTo(5.5 * 2.54 * MM, 12)
    expect(GND_RAIL_Z).toBeCloseTo(-8 * 2.54 * MM, 12)
  })

  it('keeps the probe lane free of part legs on every site', () => {
    for (const part of PARTS) {
      for (const t of [part.a, part.b]) {
        if (t.site !== 'gnd') expect(t.lane).not.toBe(PROBE_LANE)
      }
    }
  })

  it('never puts two legs in the same hole', () => {
    const used = new Set<string>()
    for (const part of PARTS) {
      for (const t of [part.a, part.b]) {
        if (t.site === 'gnd') continue
        const key = `${t.site}:${t.lane}`
        expect(used.has(key)).toBe(false)
        used.add(key)
      }
    }
  })

  it('fits every hole inside the slab footprint', () => {
    const holes = holePositions()
    expect(holes.length).toBe(63 * 10 + 4 * 50)
    for (const [x, , z] of holes) {
      expect(Math.abs(x)).toBeLessThan(BOARD.length / 2)
      expect(Math.abs(z)).toBeLessThan(BOARD.depth / 2)
    }
  })

  it('wires the netlist from ARCHITECTURE section 5.1', () => {
    const byId = Object.fromEntries(PARTS.map((p) => [p.id, [p.a.site, p.b.site]]))
    expect(byId).toEqual({
      BAT: [0, 'gnd'],
      R1: [0, 1],
      R2: [1, 2],
      R3: [2, 'gnd'],
      R4: [2, 5],
      R5: [5, 'gnd'],
      R6: [1, 3],
      D1: [3, 4],
      R7: [4, 'gnd'],
    })
  })

  it('puts a row terminal on the board surface over its row and a ground terminal on the rail', () => {
    const r1 = PARTS.find((p) => p.id === 'R1')!
    const [x, y, z] = terminalPosition(r1.a)
    expect(x).toBeCloseTo(siteX(0), 12)
    expect(y).toBeCloseTo(BOARD.top, 12)
    expect(z).toBeCloseTo(rowLaneZ('b'), 12)
    const r3 = PARTS.find((p) => p.id === 'R3')!
    const g = terminalPosition(r3.b)
    expect(g[0]).toBeCloseTo(siteX(2), 12)
    expect(g[2]).toBeCloseTo(GND_RAIL_Z, 12)
  })

  it('reports the rows a part touches, 0-based, ground excluded', () => {
    expect(partRows('R4')).toEqual([2, 5])
    expect(partRows('R3')).toEqual([2])
    expect(partRows('D1')).toEqual([3, 4])
  })

  it('maps hypotheses to the part they blame', () => {
    expect(partForHypothesis('R3_10x_low')).toBe('R3')
    expect(partForHypothesis('LED_open')).toBe('D1')
    expect(partForHypothesis('battery_low')).toBe('BAT')
    expect(partForHypothesis('nominal')).toBeNull()
    expect(partForHypothesis('unknown_thing')).toBeNull()
  })

  it('centres a two-row resistor halfway between its rows', () => {
    const [x, , z] = partCenter('R1')
    expect(x).toBeCloseTo((siteX(0) + siteX(1)) / 2, 12)
    expect(z).toBeCloseTo(rowLaneZ('b'), 12)
  })
})
