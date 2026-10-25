import { Html } from '@react-three/drei'
import { useLanding } from '@/state/landing'
import { useSession } from '@/state/session'
import type { Instrument } from './instrument'
import {
  BOARD,
  PARTS,
  ROW_FRAME,
  SITE_COUNT,
  partCenter,
  siteX,
  type PartId,
  type Vec3,
} from './layout'
import { warningSite } from './selectors'
import { DEPTH_SITES_CM, ROAST_CENTRE, ROAST_RADIUS, depthPosition } from './roastLayout'

/** Keeps labels inside the scene layer's stacking context, under page content. */
const Z_INDEX_RANGE: [number, number] = [5, 0]
const LABEL_CLASS =
  'pointer-events-none select-none whitespace-nowrap font-mono text-xs leading-none text-text-2'
const WARNING_CLASS =
  'pointer-events-none select-none whitespace-nowrap rounded-hard border-l-4 border-warning bg-warning-surface px-1.5 py-1 font-mono text-xs font-semibold leading-none text-warning-text'
const BADGE_CLASS =
  'pointer-events-none select-none rounded-hard border border-border-strong bg-surface-1 px-1.5 py-1 font-mono text-xs font-semibold tracking-[0.08em] text-text'
const SITES = Array.from({ length: SITE_COUNT }, (_, i) => i)
const ROW_LABEL_Z = BOARD.depth / 2 + 0.004
const PART_LABEL_LIFT = 0.016
/** Nudges for parts whose bodies share an x with a neighbour (R4 under D1, R6 over R3's row). */
const PART_LABEL_NUDGE: Partial<Record<PartId, Vec3>> = {
  BAT: [0, 0.008, 0],
  R4: [0.01, -0.004, 0],
  R6: [0.004, 0.002, 0.004],
  D1: [0, 0.004, 0],
}
const DEPTH_LABEL_LIFT = 0.008
const UNIT_LABEL_GAP = 0.012

interface LabelProps {
  position: Vec3
  text: string
  hidden: boolean
  className?: string
}

/**
 * Decorative only: aria-hidden, the DOM panels carry the real labels. Screen-space rather than
 * `transform`: transform-mode labels drifted off their anchors in the sim slot and shrank to
 * unreadable at the fitted distance. Occlusion is off: drei's occlude raycasts the scene per
 * label per frame and sets React state from useFrame, and the polar clamp keeps labels in view.
 * Labels stay mounted and hide instead of unmounting: drei unmounts each label's React root
 * synchronously, which React 19 reports as an error when it happens mid-render.
 */
function Label({ position, text, hidden, className = LABEL_CLASS }: LabelProps) {
  return (
    <Html position={position} center zIndexRange={Z_INDEX_RANGE}>
      <div aria-hidden="true" className={className} hidden={hidden}>
        {text}
      </div>
    </Html>
  )
}

interface GroupLabelProps {
  hidden: boolean
  detail: boolean
}

function CircuitLabels({ hidden, detail }: GroupLabelProps) {
  const siteLabels = useSession((s) => s.catalog?.sites.map((site) => site.label).join('|') ?? '')
  const warned = useSession(warningSite)
  const names = siteLabels ? siteLabels.split('|') : []
  const quiet = hidden || !detail
  return (
    <group name="circuit-labels">
      {SITES.map((i) => (
        <Label
          key={i}
          hidden={quiet}
          position={[siteX(i), 0, ROW_LABEL_Z]}
          text={names[i] ?? `row ${i + 1}`}
        />
      ))}
      {PARTS.map((part) => {
        const c = partCenter(part.id)
        const n = PART_LABEL_NUDGE[part.id] ?? [0, 0, 0]
        return (
          <Label
            key={part.id}
            hidden={quiet}
            position={[c[0] + n[0], c[1] + PART_LABEL_LIFT + n[1], c[2] + n[2]]}
            text={part.id}
          />
        )
      })}
      <Label
        hidden={hidden || warned === null}
        position={[siteX(warned ?? 0), 0.012, ROW_FRAME.centreZ - ROW_FRAME.depth / 2]}
        text="! Warning: probe not here"
        className={WARNING_CLASS}
      />
    </group>
  )
}

function RoastLabels({ hidden, detail }: GroupLabelProps) {
  return (
    <group name="roast-labels">
      {DEPTH_SITES_CM.map((cm, i) => {
        const p = depthPosition(i)
        return (
          <Label
            key={cm}
            hidden={hidden || !detail}
            position={[p[0], p[1] + DEPTH_LABEL_LIFT, p[2]]}
            text={String(cm)}
          />
        )
      })}
      <Label
        hidden={hidden || !detail}
        position={[
          ROAST_CENTRE[0] + ROAST_RADIUS + UNIT_LABEL_GAP,
          ROAST_CENTRE[1] + DEPTH_LABEL_LIFT,
          ROAST_CENTRE[2],
        ]}
        text="cm deep"
      />
      <Label
        hidden={hidden}
        position={[
          ROAST_CENTRE[0] - ROAST_RADIUS * 0.7,
          ROAST_CENTRE[1] + ROAST_RADIUS * 0.85,
          ROAST_CENTRE[2],
        ]}
        text="SIMULATED"
        className={BADGE_CLASS}
      />
    </group>
  )
}

interface LabelsProps {
  instrument: Instrument
}

/** Row, part and depth labels in the sim; on the landing only the SIMULATED badge and warnings. */
export function Labels({ instrument }: LabelsProps) {
  const detail = useLanding((s) => s.sceneMode === 'sim')
  return (
    <>
      <CircuitLabels hidden={instrument !== 'circuit'} detail={detail} />
      <RoastLabels hidden={instrument !== 'roast'} detail={detail} />
    </>
  )
}
