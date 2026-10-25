import { Html } from '@react-three/drei'
import { useSession } from '@/state/session'
import type { Instrument } from './instrument'
import { BOARD, PARTS, ROW_FRAME, SITE_COUNT, partCenter, siteX } from './layout'
import { warningSite } from './selectors'
import { DEPTH_SITES_CM, ROAST_CENTRE, ROAST_RADIUS, depthPosition } from './roastLayout'

/** Scales label pixels to world size in transform mode; tuned at the sim camera distance. */
const DISTANCE_FACTOR = 0.12
const LABEL_CLASS =
  'pointer-events-none select-none whitespace-nowrap font-mono text-[11px] leading-none text-text-2'
const SITES = Array.from({ length: SITE_COUNT }, (_, i) => i)
const ROW_LABEL_Z = BOARD.depth / 2 + 0.004
const PART_LABEL_LIFT = 0.016

interface LabelProps {
  position: [number, number, number]
  text: string
  className?: string
}

/**
 * Decorative only: aria-hidden, the DOM panels carry the real labels. Html occlusion is off on
 * purpose: drei's occlude raycasts the scene per label per frame and sets React state from
 * useFrame, and with the polar clamp nothing can stand between a label and the camera.
 */
function Label({ position, text, className = LABEL_CLASS }: LabelProps) {
  return (
    <Html position={position} transform sprite distanceFactor={DISTANCE_FACTOR} center>
      <div aria-hidden="true" className={className}>
        {text}
      </div>
    </Html>
  )
}

function CircuitLabels() {
  const siteLabels = useSession((s) => s.catalog?.sites.map((site) => site.label).join('|') ?? '')
  const warned = useSession(warningSite)
  const names = siteLabels ? siteLabels.split('|') : []
  return (
    <group name="circuit-labels">
      {SITES.map((i) => (
        <Label key={i} position={[siteX(i), 0, ROW_LABEL_Z]} text={names[i] ?? `row ${i + 1}`} />
      ))}
      {PARTS.map((part) => {
        const c = partCenter(part.id)
        return (
          <Label key={part.id} position={[c[0], c[1] + PART_LABEL_LIFT, c[2]]} text={part.id} />
        )
      })}
      {warned !== null && (
        <Label
          position={[siteX(warned), 0.012, ROW_FRAME.centreZ - ROW_FRAME.depth / 2]}
          text="! Warning: probe not here"
          className="pointer-events-none select-none whitespace-nowrap rounded-hard border-l-4 border-warning bg-warning-surface px-1.5 py-1 font-mono text-[11px] font-semibold leading-none text-warning-text"
        />
      )}
    </group>
  )
}

function RoastLabels() {
  return (
    <group name="roast-labels">
      {DEPTH_SITES_CM.map((cm, i) => {
        const p = depthPosition(i)
        return <Label key={cm} position={[p[0], p[1] + 0.012, p[2]]} text={`${cm} cm`} />
      })}
      <Label
        position={[ROAST_CENTRE[0], ROAST_CENTRE[1] + ROAST_RADIUS + 0.01, ROAST_CENTRE[2]]}
        text="SIMULATED"
        className="pointer-events-none select-none rounded-hard border border-border-strong bg-surface-1 px-1.5 py-1 font-mono text-[11px] font-semibold tracking-[0.08em] text-text"
      />
    </group>
  )
}

interface LabelsProps {
  instrument: Instrument
}

export function Labels({ instrument }: LabelsProps) {
  return instrument === 'circuit' ? <CircuitLabels /> : <RoastLabels />
}
