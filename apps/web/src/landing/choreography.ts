/**
 * Landing choreography contract (frozen signature; the landing lane owns the body).
 * The scene's CameraRig reads `useLanding.getState().progress` inside useFrame and damps toward
 * `poseAt(progress)`. Pure function, no React, unit-tested at its keyframes.
 *
 * Progress model: the page is ten equal bands, one per section in SECTION_ORDER. Inside a band,
 * the fraction is how far that section (or its sticky track) has scrolled, so the bands do not
 * depend on pixel heights. Section `i` spans progress [i / 10, (i + 1) / 10].
 */
import type { LandingSection } from '@/state/landing'

export type Vec3 = readonly [number, number, number]

export type SceneKind = 'circuit' | 'roast'

export interface ScenePose {
  /** Camera position and look-at target in meters (board units). */
  camera: Vec3
  target: Vec3
  fov: number
  /** Which instrument is visible; crossfade is driven by `roastMix`. */
  scene: SceneKind
  /** 0 = circuit only, 1 = roast only. */
  roastMix: number
  /** 0 = layers together, 1 = board, hand-confusion and belief planes fully separated in z. */
  explode: number
  /** Index of the math line being explained in `how` (0..5), or -1 for none. */
  mathLine: number
  /** Plumb line opacity; fades into the DOM ladder rail. */
  plumbOpacity: number
}

export const SIM_POSE: ScenePose = {
  camera: [0.18, 0.22, 0.28],
  target: [0, 0, 0],
  fov: 35,
  scene: 'circuit',
  roastMix: 0,
  explode: 0,
  mathLine: -1,
  plumbOpacity: 1,
}

export const SECTION_ORDER: readonly LandingSection[] = [
  'mast',
  'research',
  'problem',
  'play',
  'how',
  'generalize',
  'product',
  'ladder',
  'evidence',
  'close',
]

export const BAND = 1 / SECTION_ORDER.length
export const MATH_LINE_COUNT = 6

export type StickySection = 'play' | 'how' | 'generalize'

export interface NamedState {
  name: string
  /** Fraction through the section's sticky track, 0..1. */
  at: number
}

/** The 3 to 5 named states each sticky scene snaps to after scrolling stops (DESIGN_REFERENCES F4). */
export const STICKY_STATES: Record<StickySection, readonly NamedState[]> = {
  play: [
    { name: 'instructed', at: 0 },
    { name: 'travelling', at: 1 / 3 },
    { name: 'landed', at: 2 / 3 },
    { name: 'resolved', at: 1 },
  ],
  how: [
    { name: 'hand', at: 1 / 12 },
    { name: 'update', at: 5 / 12 },
    { name: 'choose', at: 7 / 12 },
    { name: 'layers', at: 9 / 12 },
    { name: 'refuse', at: 11 / 12 },
  ],
  generalize: [
    { name: 'bench', at: 0 },
    { name: 'roast', at: 0.4 },
    { name: 'audit', at: 0.75 },
  ],
}

export function isStickySection(section: LandingSection): section is StickySection {
  return section === 'play' || section === 'how' || section === 'generalize'
}

export function sectionIndex(section: LandingSection): number {
  return SECTION_ORDER.indexOf(section)
}

/** Global progress for a fraction `f` through `section`. */
export function progressOf(section: LandingSection, f: number): number {
  return (sectionIndex(section) + clamp01(f)) * BAND
}

/** Which section a progress value falls in, and how far through it. */
export function locate(progress: number): { section: LandingSection; f: number } {
  const p = clamp01(progress)
  const index = Math.min(SECTION_ORDER.length - 1, Math.floor(p / BAND))
  return { section: SECTION_ORDER[index]!, f: clamp01(p / BAND - index) }
}

/** The named sticky state nearest to `progress`, or null outside the sticky sections. */
export function stickyStateAt(progress: number): { section: StickySection; state: string } | null {
  const { section, f } = locate(progress)
  if (!isStickySection(section)) return null
  return { section, state: nearestState(STICKY_STATES[section], f).name }
}

export function nearestState(states: readonly NamedState[], f: number): NamedState {
  return states.reduce((best, s) => (Math.abs(s.at - f) < Math.abs(best.at - f) ? s : best))
}

type NumericPose = Pick<
  ScenePose,
  'camera' | 'target' | 'fov' | 'roastMix' | 'explode' | 'plumbOpacity'
>

interface Keyframe {
  at: number
  pose: NumericPose
}

const p = progressOf

/** Rest pose: board on the right of a left-aligned text column. Used by mast and close. */
const REST: NumericPose = {
  camera: [0.2, 0.17, 0.3],
  target: [-0.07, 0, 0],
  fov: 34,
  roastMix: 0,
  explode: 0,
  plumbOpacity: 1,
}
const PLAY_LANDED: NumericPose = {
  camera: [0.07, 0.14, 0.16],
  target: [0.05, 0, 0],
  fov: 28,
  roastMix: 0,
  explode: 0,
  plumbOpacity: 1,
}
const PLAY_RESOLVED: NumericPose = { ...PLAY_LANDED, camera: [0.08, 0.17, 0.19], fov: 29 }
const HOW_TOP: NumericPose = {
  camera: [-0.06, 0.38, 0.02],
  target: [-0.06, 0, 0],
  fov: 30,
  roastMix: 0,
  explode: 0,
  plumbOpacity: 1,
}
const ROAST: NumericPose = {
  camera: [-0.02, 0.1, 0.26],
  target: [-0.07, 0, 0],
  fov: 30,
  roastMix: 1,
  explode: 0,
  plumbOpacity: 1,
}
const AUDIT: NumericPose = { ...ROAST, camera: [-0.03, 0.06, 0.2], fov: 28 }
const RECEDED: NumericPose = {
  camera: [0.26, 0.3, 0.46],
  target: [0.08, 0, 0],
  fov: 34,
  roastMix: 0,
  explode: 0,
  plumbOpacity: 1,
}

/**
 * Keyframes in ascending progress. Explode is non-zero only inside `how`; roastMix only inside
 * `generalize`. Every named sticky state sits on a keyframe so a snapped scene rests on one.
 */
export const KEYFRAMES: readonly Keyframe[] = [
  { at: p('mast', 0), pose: REST },
  { at: p('research', 0), pose: { ...REST, camera: [0.22, 0.24, 0.34], target: [-0.05, 0, 0] } },
  {
    at: p('problem', 0),
    pose: { ...REST, camera: [0.06, 0.12, 0.2], target: [-0.05, 0, 0], fov: 30 },
  },
  {
    at: p('play', 0),
    pose: { ...PLAY_LANDED, camera: [0.1, 0.2, 0.22], target: [0.06, 0, 0], fov: 30 },
  },
  { at: p('play', 1 / 3), pose: { ...PLAY_LANDED, camera: [0.08, 0.16, 0.18] } },
  { at: p('play', 2 / 3), pose: PLAY_LANDED },
  { at: p('play', 1), pose: PLAY_RESOLVED },
  { at: p('how', 1 / 12), pose: HOW_TOP },
  { at: p('how', 5 / 12), pose: { ...HOW_TOP, camera: [-0.06, 0.34, 0.02] } },
  { at: p('how', 1 / 2), pose: { ...HOW_TOP, camera: [-0.05, 0.3, 0.1] } },
  {
    at: p('how', 3 / 4),
    pose: { ...HOW_TOP, camera: [-0.18, 0.16, 0.3], target: [-0.06, 0.03, 0], fov: 32, explode: 1 },
  },
  {
    at: p('generalize', 0),
    pose: { ...REST, camera: [0, 0.18, 0.32], target: [-0.06, 0, 0], fov: 32 },
  },
  { at: p('generalize', 0.4), pose: ROAST },
  { at: p('generalize', 0.75), pose: AUDIT },
  { at: p('generalize', 0.85), pose: AUDIT },
  { at: p('product', 0), pose: RECEDED },
  { at: p('ladder', 0), pose: RECEDED },
  { at: p('evidence', 0), pose: { ...RECEDED, plumbOpacity: 0 } },
  { at: p('close', 0), pose: { ...REST, plumbOpacity: 0 } },
  { at: p('close', 1), pose: REST },
]

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0
  return Math.min(1, Math.max(0, x))
}

/** Monotonic ease inside each segment, so every field moves one way between two keyframes. */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function mixVec(a: Vec3, b: Vec3, t: number): Vec3 {
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]
}

function mathLineAt(progress: number): number {
  const { section, f } = locate(progress)
  if (section !== 'how') return -1
  return Math.min(MATH_LINE_COUNT - 1, Math.floor(f * MATH_LINE_COUNT))
}

function segmentAt(progress: number): { from: Keyframe; to: Keyframe; t: number } {
  const last = KEYFRAMES[KEYFRAMES.length - 1]!
  if (progress >= last.at) return { from: last, to: last, t: 0 }
  const i = KEYFRAMES.findIndex((k, j) => progress >= k.at && progress < KEYFRAMES[j + 1]!.at)
  const from = KEYFRAMES[Math.max(0, i)]!
  const to = KEYFRAMES[Math.max(0, i) + 1]!
  return { from, to, t: smoothstep((progress - from.at) / (to.at - from.at)) }
}

/** Scene pose for a page progress in [0, 1]. Out-of-range and non-finite inputs clamp. */
export function poseAt(progress: number): ScenePose {
  const clamped = clamp01(progress)
  const { from, to, t } = segmentAt(clamped)
  const a = from.pose
  const b = to.pose
  const roastMix = mix(a.roastMix, b.roastMix, t)
  return {
    camera: mixVec(a.camera, b.camera, t),
    target: mixVec(a.target, b.target, t),
    fov: mix(a.fov, b.fov, t),
    scene: roastMix >= 0.5 ? 'roast' : 'circuit',
    roastMix,
    explode: mix(a.explode, b.explode, t),
    mathLine: mathLineAt(clamped),
    plumbOpacity: mix(a.plumbOpacity, b.plumbOpacity, t),
  }
}

/** Progress values worth resting on: keyframes and named states. Reduced motion quantizes to these. */
export function restingProgress(progress: number): number {
  const stops = KEYFRAMES.map((k) => k.at)
  return stops.reduce((best, s) => (Math.abs(s - progress) < Math.abs(best - progress) ? s : best))
}
