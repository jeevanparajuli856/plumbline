import type { CSSProperties } from 'react'
import s from './landing.module.css'

/** Widest half-angle of the spread, reached at maximum entropy. */
const MAX_SPREAD_DEG = 16
const W = 280
const H = 360
const PIVOT_Y = 16
const BOB_Y = 300

interface PlumbFigureProps {
  entropyBits: number
  maxEntropyBits: number
}

function wedge(halfDeg: number): string {
  const r = BOB_Y - PIVOT_Y
  const a = (halfDeg * Math.PI) / 180
  const cx = W / 2
  const dx = Math.sin(a) * r
  const y = PIVOT_Y + Math.cos(a) * r
  return `M ${cx} ${PIVOT_Y} L ${cx - dx} ${y} A ${r} ${r} 0 0 0 ${cx + dx} ${y} Z`
}

/**
 * The plumb line drawn in the DOM: the spread is the uncertainty (entropy over its maximum),
 * and the line settles once each time the entropy changes. Shown when there is no 3D scene.
 */
export function PlumbFigure({ entropyBits, maxEntropyBits }: PlumbFigureProps) {
  const ratio = maxEntropyBits > 0 ? Math.min(1, Math.max(0, entropyBits / maxEntropyBits)) : 0
  const half = ratio * MAX_SPREAD_DEG
  const swing = { '--amp': `${half}deg` } as CSSProperties
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={s.plumb} aria-hidden="true" focusable="false">
      <line
        x1={W / 2 - 40}
        x2={W / 2 + 40}
        y1={PIVOT_Y}
        y2={PIVOT_Y}
        stroke="currentColor"
        strokeWidth={2}
      />
      {half > 0.2 && <path d={wedge(half)} className={s.plumbSpread} strokeWidth={1.5} />}
      <line
        x1={W / 2}
        x2={W / 2}
        y1={BOB_Y + 40}
        y2={H}
        stroke="currentColor"
        strokeWidth={1}
        strokeDasharray="2 6"
      />
      <g key={entropyBits} className={s.plumbSwing} style={swing}>
        <line
          x1={W / 2}
          x2={W / 2}
          y1={PIVOT_Y}
          y2={BOB_Y}
          stroke="currentColor"
          strokeWidth={1.5}
        />
        <path
          d={`M ${W / 2 - 14} ${BOB_Y} L ${W / 2 + 14} ${BOB_Y} L ${W / 2} ${BOB_Y + 34} Z`}
          className={s.plumbBob}
          strokeWidth={1.5}
        />
      </g>
    </svg>
  )
}
