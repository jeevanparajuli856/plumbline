import { seededRandom } from '@/lib/seed'
import type { DomainId, Phase } from '@/state/types'

/**
 * Probe tremor and plumb-line math. Pure: no React, no three.
 * Rates stay at or under 2.1 Hz, well below the 3 Hz flash limit.
 */
/** Tremor amplitude when p_same is the assumed DEFAULT_P_SAME (ARCHITECTURE section 8). */
export const TREMOR_AT_ASSUMED_PRIOR_M = 0.0006
export const TREMOR_FREQS_HZ = [1.3, 2.1] as const
/**
 * About one pixel at the fitted sim distance (dpr 1). Below it the tremor is invisible, so the
 * scene neither draws it nor keeps the frame loop running for it.
 */
export const TREMOR_VISIBLE_M = 0.00025
/** P(l = n | n) of the default confusion model (0.78 / 0.08 / 0.03, `.claude/rules/00-truehand.md`). */
export const DEFAULT_P_SAME = 0.78
export const MAX_PENDULUM_RAD = (18 * Math.PI) / 180
/** One swing per state change; maps to `--motion-pendulum-settle` (1000 ms). */
export const PENDULUM_PERIOD_S = 1
export const ALTERNATE_PERIOD_MS = 3000

const TWO_PI = 2 * Math.PI

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0
  return Math.min(1, Math.max(0, x))
}

/**
 * The hand's own unsteadiness, so it comes from the confusion prior P(l = n | n), never from the
 * placement posterior (that describes where the last reading came from). ARCHITECTURE section 8:
 * 0.6 mm x (1 - p_same) / (1 - 0.78); 0.6 mm under the assumed model, 0 for a perfect hand.
 */
export function tremorAmplitude(pSame: number): number {
  return (TREMOR_AT_ASSUMED_PRIOR_M * (1 - clamp01(pSame))) / (1 - DEFAULT_P_SAME)
}

/** p_same for the current session. The catalog does not carry the confusion model yet. */
export function confusionPSame(): number {
  return DEFAULT_P_SAME
}

export interface TremorContext {
  phase: Phase
  domain: DomainId
  amplitude: number
}

/** Tremor runs (and holds a frame-loop lease) only on the board, while a reading is awaited. */
export function tremorActive({ phase, domain, amplitude }: TremorContext): boolean {
  return phase === 'awaiting_reading' && domain === 'circuit' && amplitude > TREMOR_VISIBLE_M
}

/** Normalised sum of the two sines; |offset| <= amplitude. */
export function tremorOffset(t: number, amplitude: number, phaseA: number, phaseB: number): number {
  const [fa, fb] = TREMOR_FREQS_HZ
  return amplitude * 0.5 * (Math.sin(TWO_PI * fa * t + phaseA) + Math.sin(TWO_PI * fb * t + phaseB))
}

/** Four phases (x pair, z pair) from a seed, so the same session trembles the same way. */
export function tremorPhases(seed: number): [number, number, number, number] {
  const rand = seededRandom(seed)
  return [rand() * TWO_PI, rand() * TWO_PI, rand() * TWO_PI, rand() * TWO_PI]
}

export function pendulumAmplitude(entropyBits: number, maxEntropyBits: number): number {
  if (maxEntropyBits <= 0) return MAX_PENDULUM_RAD
  return MAX_PENDULUM_RAD * clamp01(entropyBits / maxEntropyBits)
}

/** One damped swing of the given amplitude over one period, then rest. */
export function pendulumAngle(t: number, amplitude: number, period = PENDULUM_PERIOD_S): number {
  if (t <= 0 || t >= period) return 0
  const u = t / period
  return amplitude * Math.sin(TWO_PI * u) * (1 - u) * (1 - u)
}

export function alternateIndex(
  elapsedMs: number,
  count: number,
  periodMs = ALTERNATE_PERIOD_MS,
): number {
  if (count <= 1) return 0
  return Math.floor(elapsedMs / periodMs) % count
}
