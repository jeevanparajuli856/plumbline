import { seededRandom } from '@/lib/seed'

/**
 * Probe tremor and plumb-line math. Pure: no React, no three.
 * Rates stay at or under 2.1 Hz, well below the 3 Hz flash limit.
 */
export const TREMOR_MAX_M = 0.0006
export const TREMOR_FREQS_HZ = [1.3, 2.1] as const
/**
 * P(l = n) of the default confusion model (0.78 / 0.08 / 0.03, `.claude/rules/00-plumbline.md`).
 * Used only before any reading, when the store's placement is still all zeros.
 */
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

export function tremorAmplitude(pToldSite: number): number {
  return TREMOR_MAX_M * (1 - clamp01(pToldSite))
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

export function pTold(placement: readonly number[], toldSite: number | null): number {
  if (toldSite === null) return DEFAULT_P_SAME
  const total = placement.reduce((sum, p) => sum + p, 0)
  if (total <= 0) return DEFAULT_P_SAME
  return placement[toldSite] ?? 0
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
