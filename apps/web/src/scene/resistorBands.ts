/** Three-band resistor colour code (two significant digits and a multiplier). Pure. */
export type BandColour =
  'black' | 'brown' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'violet' | 'grey' | 'white'

const DIGIT_COLOURS: readonly BandColour[] = [
  'black',
  'brown',
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'violet',
  'grey',
  'white',
]

export function resistorBands(ohms: number): [BandColour, BandColour, BandColour] {
  const exponent = Math.floor(Math.log10(ohms)) - 1
  const significant = ohms / 10 ** exponent
  const digits = Math.round(significant)
  if (exponent < 0 || Math.abs(significant - digits) > 1e-9) {
    throw new Error(`Cannot encode ${ohms} ohms in three bands`)
  }
  const colour = (n: number) => DIGIT_COLOURS[n] as BandColour
  return [colour(Math.floor(digits / 10)), colour(digits % 10), colour(exponent)]
}

/** Physical hues for the bands; not UI colours, so they are not design tokens. */
export const BAND_HSL: Record<BandColour, string> = {
  black: 'hsl(0, 0%, 8%)',
  brown: 'hsl(25, 55%, 26%)',
  red: 'hsl(2, 70%, 45%)',
  orange: 'hsl(28, 90%, 52%)',
  yellow: 'hsl(50, 90%, 55%)',
  green: 'hsl(130, 50%, 35%)',
  blue: 'hsl(215, 70%, 45%)',
  violet: 'hsl(275, 50%, 45%)',
  grey: 'hsl(0, 0%, 50%)',
  white: 'hsl(0, 0%, 95%)',
}
