import { motionTokens, springs } from '@/lib/motion'

/**
 * Spring-like easing and the reveal path. Pure: no React, no three.
 * Durations come from the motion tokens (`--motion-probe-travel` is `slow`, 600 ms).
 */
export interface SpringParams {
  stiffness: number
  damping: number
  mass?: number
}

export const REVEAL_TRAVEL_S = motionTokens.duration.slow
export const REVEAL_DIP_S = 0.25
export const REVEAL_TOTAL_S = REVEAL_TRAVEL_S + REVEAL_DIP_S
/** Arc height over the board while the hand travels to where it actually lands. */
export const REVEAL_LIFT = 0.008
/** How far the tip presses into the hole on contact. */
export const CONTACT_DIP = 0.0015
const MAX_FRAME_DELTA_S = 1 / 30

/** Unit step response of a damped spring (0 at t = 0, settles at 1). Closed form for all regimes. */
export function springStep(t: number, { stiffness, damping, mass = 1 }: SpringParams): number {
  if (t <= 0) return 0
  const w0 = Math.sqrt(stiffness / mass)
  const zeta = damping / (2 * Math.sqrt(stiffness * mass))
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta)
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t))
  }
  if (zeta === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t)
  const s = Math.sqrt(zeta * zeta - 1)
  const r1 = -w0 * (zeta - s)
  const r2 = -w0 * (zeta + s)
  return 1 + (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r1 - r2)
}

export interface RevealPose {
  /** Fraction of the horizontal path covered (spring-eased, may overshoot slightly). */
  travel: number
  /** Extra height of the arc, meters. */
  lift: number
  /** Depth pressed into the hole, meters. */
  dip: number
  done: boolean
}

const TRAVEL_NORMALISER = springStep(REVEAL_TRAVEL_S, springs.gentle)

/** Probe pose `t` seconds into the reveal: arc with an 8 mm lift, then a 1.5 mm contact dip. */
export function revealPose(t: number): RevealPose {
  if (t <= 0) return { travel: 0, lift: 0, dip: 0, done: false }
  if (t >= REVEAL_TOTAL_S) return { travel: 1, lift: 0, dip: 0, done: true }
  if (t >= REVEAL_TRAVEL_S) {
    const u = (t - REVEAL_TRAVEL_S) / REVEAL_DIP_S
    return { travel: 1, lift: 0, dip: CONTACT_DIP * Math.sin(Math.PI * u), done: false }
  }
  const u = t / REVEAL_TRAVEL_S
  return {
    travel: springStep(t, springs.gentle) / TRAVEL_NORMALISER,
    lift: REVEAL_LIFT * Math.sin(Math.PI * u),
    dip: 0,
    done: false,
  }
}

/** Frame-rate independent exponential approach. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}

/** In demand mode the first frame after idling sees the whole idle gap as delta; cap it. */
export function clampDelta(dt: number): number {
  if (dt <= 0) return 0
  return Math.min(dt, MAX_FRAME_DELTA_S)
}
