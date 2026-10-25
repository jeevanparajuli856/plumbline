import { cx } from '../cx'
import a from './art.module.css'

interface ArtProps {
  /** Parallax depth for the motion module (UI_CONTRACT 5.3), 0.05 to 0.3. */
  depth?: number
  className?: string | undefined
}

const ROWS = [1, 2, 3, 4, 5, 6]

/** The idea behind the mark (ADR-0013): a braille cell and breadboard rows are the same grid. */
export function BrailleGridArt({ depth = 0.1, className }: ArtProps) {
  const cols = Array.from({ length: 10 }, (_, i) => 70 + i * 44)
  const rows = ROWS.map((r) => 70 + (r - 1) * 40)
  /** Raised dots of the braille cell, as [column index, row index]. */
  const raised = [
    [2, 1],
    [3, 1],
    [3, 2],
    [2, 3],
  ]
  return (
    <figure className={cx(a.art, className)} data-motion="parallax" data-motion-depth={depth}>
      <svg
        viewBox="0 0 520 340"
        role="img"
        aria-label="Drawing: a braille cell laid over breadboard rows. Both are the same grid of identical holes; one hole is ringed as the one the probe found."
      >
        <rect x="20" y="40" width="480" height="270" rx="6" className={a.plate} />
        {rows.map((y, r) => (
          <text key={y} x="36" y={y + 5} className={a.label}>
            {r + 1}
          </text>
        ))}
        {rows.map((y) =>
          cols.map((x) => (
            <rect key={`${x}-${y}`} x={x - 6} y={y - 6} width="12" height="12" className={a.hole} />
          )),
        )}
        <rect x="136" y="88" width="88" height="124" rx="16" className={a.told} />
        {raised.map(([c, r]) => (
          <circle key={`${c}-${r}`} cx={cols[c!]} cy={rows[r!]} r="8" className={a.dot} />
        ))}
        <circle cx={cols[7]} cy={rows[1]} r="15" className={a.found} />
        <text x="136" y="30" className={a.label}>
          braille cell
        </text>
        <text x={cols[7]! - 18} y="30" className={a.label}>
          found
        </text>
        <path d={`M ${cols[7]} 36 V ${rows[1]! - 18}`} className={a.lineThin} />
        <text x="306" y="332" className={a.label}>
          breadboard rows 1 to 6
        </text>
      </svg>
    </figure>
  )
}

/** A hand holds the probe over breadboard rows: told row 3 outlined, the tip landed on row 2. */
export function HandProbeArt({ depth = 0.12, className }: ArtProps) {
  const rowX = ROWS.map((r) => 70 + (r - 1) * 76)
  const holesY = [252, 268, 284, 300, 316]
  return (
    <figure className={cx(a.art, className)} data-motion="parallax" data-motion-depth={depth}>
      <svg
        viewBox="0 0 520 360"
        role="img"
        aria-label="Line drawing: a hand holds a probe over six breadboard rows. Row 3, the row it was told, is outlined; the probe tip has landed on row 2."
      >
        <rect x="20" y="236" width="480" height="96" rx="6" className={a.plate} />
        <rect x={rowX[1]! - 16} y="242" width="32" height="84" rx="4" className={a.landed} />
        <rect x={rowX[2]! - 20} y="238" width="40" height="92" rx="6" className={a.told} />
        {rowX.map((x) =>
          holesY.map((y) => (
            <rect key={`${x}-${y}`} x={x - 5} y={y - 5} width="10" height="10" className={a.hole} />
          )),
        )}
        {rowX.map((x, i) => (
          <text key={x} x={x - 16} y="352" className={a.label}>
            row {i + 1}
          </text>
        ))}
        {/* Drawn along the probe: the group's x axis runs from the tip (on row 2) up the probe. */}
        <g transform={`translate(${rowX[1]! + 125} 135) rotate(-42.6)`}>
          <path d="M -170 0 L -150 0" className={a.line} />
          <rect x="-152" y="-7" width="320" height="14" rx="7" className={a.probe} />
          <path d="M 166 0 C 200 0, 210 -40, 260 -36" className={a.lead} />
          {/* Palm and the back of the hand, behind the fingers. */}
          <path
            d="M 18 -26 C 40 -44, 96 -44, 124 -24 C 142 -10, 140 18, 120 30 L 40 34 C 20 34, 8 14, 18 -26 Z"
            className={a.skin}
          />
          {/* Four fingers curled under the probe, then the thumb across the top. */}
          {[-26, -8, 10, 28].map((x) => (
            <rect key={x} x={x} y="-4" width="20" height="38" rx="10" className={a.skin} />
          ))}
          <rect x="-34" y="-22" width="62" height="17" rx="8.5" className={a.skin} />
          <path d="M 60 -30 C 76 -36, 98 -36, 112 -28" className={a.lineThin} />
        </g>
      </svg>
    </figure>
  )
}

/** The talking meter you already own, beside the phone running Truehand. */
export function MeterPhoneArt({ depth = 0.1, className }: ArtProps) {
  return (
    <figure className={cx(a.art, className)} data-motion="parallax" data-motion-depth={depth}>
      <svg
        viewBox="0 0 520 340"
        role="img"
        aria-label="Line drawing: a talking multimeter showing 3.671 volts beside a phone running Truehand, which says touch the red probe to row 3."
      >
        <rect x="40" y="24" width="200" height="284" rx="26" className={a.body} />
        <rect x="64" y="50" width="152" height="66" rx="8" className={a.screen} />
        <text x="140" y="92" textAnchor="middle" className={a.reading}>
          3.671 V
        </text>
        <circle cx="140" cy="194" r="46" className={a.lineThin} />
        <circle cx="140" cy="194" r="10" className={a.dot} />
        <path d="M 140 194 L 166 160" className={a.line} />
        <circle cx="100" cy="276" r="9" className={a.line} />
        <circle cx="180" cy="276" r="9" className={a.line} />
        <path d="M 100 285 C 98 318, 70 330, 40 336" className={a.lineThin} />
        <path d="M 180 285 C 184 316, 214 330, 250 336" className={a.lead} />

        <rect x="296" y="30" width="180" height="300" rx="28" className={a.body} />
        <rect x="306" y="40" width="160" height="280" rx="20" className={a.screen} />
        <rect x="360" y="50" width="52" height="12" rx="6" className={a.dot} />
        <text x="320" y="96" className={a.appTitle}>
          Truehand
        </text>
        <text x="320" y="128" className={a.label}>
          NEXT STEP
        </text>
        <text x="320" y="150" className={a.appText}>
          Touch the red probe
        </text>
        <text x="320" y="168" className={a.appText}>
          to row 3.
        </text>
        <text x="320" y="204" className={a.label}>
          LAST READING
        </text>
        <text x="320" y="230" className={a.reading}>
          3.671 V
        </text>
        <rect x="320" y="276" width="132" height="26" rx="10" className={a.landed} />
        <text x="386" y="294" textAnchor="middle" className={a.appTextOnAccent}>
          Say reading
        </text>
      </svg>
    </figure>
  )
}
