import { describe, expect, it } from 'vitest'
import { resistorBands } from './resistorBands'

describe('resistorBands', () => {
  it('encodes the netlist values as digit, digit, multiplier', () => {
    expect(resistorBands(1000)).toEqual(['brown', 'black', 'red'])
    expect(resistorBands(2200)).toEqual(['red', 'red', 'red'])
    expect(resistorBands(4700)).toEqual(['yellow', 'violet', 'red'])
    expect(resistorBands(330)).toEqual(['orange', 'orange', 'brown'])
    expect(resistorBands(100)).toEqual(['brown', 'black', 'brown'])
  })

  it('handles two-digit values with a black multiplier', () => {
    expect(resistorBands(47)).toEqual(['yellow', 'violet', 'black'])
  })

  it('rejects values it cannot encode in three bands', () => {
    expect(() => resistorBands(5)).toThrow()
    expect(() => resistorBands(1234)).toThrow()
  })
})
