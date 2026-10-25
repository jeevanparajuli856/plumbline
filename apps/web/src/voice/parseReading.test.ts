import { describe, expect, it } from 'vitest'
import { DOMAINS } from '@/state/domains'
import { parseReading, type ParseErrorCode, type ReadingUnit } from './parseReading'

const circuit = DOMAINS.circuit
const thermometer = DOMAINS.thermometer

type Row = [transcript: string, value: number, unit?: ReadingUnit]

const circuitReadings: Row[] = [
  ['3.671', 3.671],
  ['0.338', 0.338],
  ['3.671 volts', 3.671, 'V'],
  ['3.671 V', 3.671, 'V'],
  ['3.671v', 3.671, 'V'],
  ['three point six seven one', 3.671],
  ['zero point three three eight', 0.338],
  ['three point six seven one volts', 3.671, 'V'],
  ['point three three eight', 0.338],
  ['three dot six seven one', 3.671],
  ['nine', 9],
  ['nine volts', 9, 'V'],
  ['one volt', 1, 'V'],
  ['twelve', 12],
  ['338 millivolts', 0.338, 'mV'],
  ['338mV', 0.338, 'mV'],
  ['three hundred thirty eight millivolts', 0.338, 'mV'],
  ['three three eight millivolts', 0.338, 'mV'],
  ['negative zero point two', -0.2],
  ['minus 0.5 volts', -0.5, 'V'],
  ['-0.25', -0.25],
  ['um, it says 3.671', 3.671],
  ['uh the meter reads three point six seven one volts', 3.671, 'V'],
  ['three point oh seven', 3.07],
  ['oh point four one six', 0.416],
  ['3 point 671', 3.671],
  ['1 point 7 3 3', 1.733],
  ['two point four nine nine', 2.499],
  ['to point four nine nine', 2.499],
  ['for point two', 4.2],
  ['eight point six six', 8.66],
  ['three point sixty seven', 3.67],
  ['One Point Seven Three Three.', 1.733],
]

const thermometerReadings: Row[] = [
  ['65.6', 65.6],
  ['sixty five point six degrees', 65.6, '°C'],
  ['sixty five point six degrees celsius', 65.6, '°C'],
  ['65.6 C', 65.6, '°C'],
  ['65.6°C', 65.6, '°C'],
  ['one hundred twenty degrees', 120, '°C'],
  ['a hundred and five', 105],
  ['minus five degrees', -5, '°C'],
  ['seventy', 70],
]

type ErrorRow = [transcript: string, error: ParseErrorCode]

const circuitErrors: ErrorRow[] = [
  ['', 'empty'],
  ['   ', 'empty'],
  ['um', 'no_number'],
  ['banana', 'unrecognized'],
  ['three bananas', 'unrecognized'],
  ['three volts and four volts', 'ambiguous'],
  ['three point four point five', 'ambiguous'],
  ['twenty twelve', 'ambiguous'],
  ['three point six degrees', 'wrong_unit'],
  ['fifty', 'out_of_range'],
  ['minus five', 'out_of_range'],
  ['3.6 volts millivolts', 'ambiguous'],
  ['three point', 'no_number'],
  ['three minus', 'ambiguous'],
]

const thermometerErrors: ErrorRow[] = [
  ['five volts', 'wrong_unit'],
  ['two hundred degrees', 'out_of_range'],
  ['ninety degrees fahrenheit', 'wrong_unit'],
]

describe('parseReading for the circuit (volts)', () => {
  it.each(circuitReadings)('parses %j as %d', (transcript, value, unit) => {
    const result = parseReading(transcript, circuit)
    expect(result).toEqual(unit ? { value: expect.closeTo(value, 9), unit } : { value: expect.closeTo(value, 9) })
  })

  it.each(circuitErrors)('rejects %j with %s', (transcript, error) => {
    expect(parseReading(transcript, circuit)).toEqual({ error })
  })
})

describe('parseReading for the thermometer (degrees Celsius)', () => {
  it.each(thermometerReadings)('parses %j as %d', (transcript, value, unit) => {
    const result = parseReading(transcript, thermometer)
    expect(result).toEqual(unit ? { value: expect.closeTo(value, 9), unit } : { value: expect.closeTo(value, 9) })
  })

  it.each(thermometerErrors)('rejects %j with %s', (transcript, error) => {
    expect(parseReading(transcript, thermometer)).toEqual({ error })
  })
})

describe('parseReading results', () => {
  it('only ever returns finite values', () => {
    for (const [transcript] of circuitReadings) {
      const result = parseReading(transcript, circuit)
      expect('value' in result && Number.isFinite(result.value)).toBe(true)
    }
  })

  it('accepts the range endpoints and nothing past them', () => {
    expect(parseReading('twelve', circuit)).toEqual({ value: 12 })
    expect(parseReading('minus one', circuit)).toEqual({ value: -1 })
    expect(parseReading('12.001', circuit)).toEqual({ error: 'out_of_range' })
  })
})

