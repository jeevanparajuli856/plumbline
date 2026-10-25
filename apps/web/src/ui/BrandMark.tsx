const HOLES = [
  [0, 0],
  [0, 26],
  [0, 52],
  [26, 0],
  [26, 52],
] as const

interface BrandMarkProps {
  /** Rendered height in px; width follows the mark's 62.5:83 box. */
  height?: number
}

/**
 * The Truehand mark (ADR-0013): a braille cell that is also a breadboard column. Five hollow
 * holes and the found one, ringed and filled in --brand. Decorative: the link text names it.
 */
export function BrandMark({ height = 28 }: BrandMarkProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="-15.5 -15.5 62.5 83"
      height={height}
      width={(height * 62.5) / 83}
      fill="none"
      className="shrink-0"
    >
      {HOLES.map(([cx, cy]) => (
        <circle key={`${cx},${cy}`} cx={cx} cy={cy} r="8" stroke="currentColor" strokeWidth="3" />
      ))}
      <circle cx="26" cy="26" r="13.5" stroke="var(--brand)" strokeWidth="3" />
      <circle cx="26" cy="26" r="8" fill="var(--brand)" />
    </svg>
  )
}
