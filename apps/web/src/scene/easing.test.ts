import { describe, expect, it } from 'vitest'
import { springs } from '@/lib/motion'
import {
  CONTACT_DIP,
  REVEAL_DIP_S,
  REVEAL_LIFT,
  REVEAL_TOTAL_S,
  REVEAL_TRAVEL_S,
  clampDelta,
  damp,
  revealPose,
  springStep,
} from './easing'

describe('springStep', () => {
  it('starts at 0 for every damping regime', () => {
    expect(springStep(0, springs.gentle)).toBe(0)
    expect(springStep(0, { stiffness: 100, damping: 20 })).toBeCloseTo(0, 12)
    expect(springStep(0, { stiffness: 100, damping: 40 })).toBeCloseTo(0, 12)
  })

  it('matches the closed-form underdamped response of springs.gentle', () => {
    expect(springStep(0.3, springs.gentle)).toBeCloseTo(1.0415174745511393, 9)
    expect(springStep(0.6, springs.gentle)).toBeCloseTo(1.0066831509308105, 9)
  })

  it('matches the critically damped and overdamped closed forms', () => {
    expect(springStep(0.1, { stiffness: 100, damping: 20 })).toBeCloseTo(0.26424111765711533, 9)
    expect(springStep(0.2, { stiffness: 100, damping: 40 })).toBeCloseTo(0.3696399777219824, 9)
  })

  it('treats negative time as not started', () => {
    expect(springStep(-1, springs.gentle)).toBe(0)
  })
})

describe('revealPose', () => {
  it('lasts 600 ms of travel plus a 250 ms contact dip', () => {
    expect(REVEAL_TRAVEL_S).toBe(0.6)
    expect(REVEAL_DIP_S).toBe(0.25)
    expect(REVEAL_TOTAL_S).toBeCloseTo(0.85, 12)
  })

  it('lifts 8 mm at mid travel and is on the ground at both ends', () => {
    expect(REVEAL_LIFT).toBe(0.008)
    expect(revealPose(0).lift).toBeCloseTo(0, 12)
    expect(revealPose(REVEAL_TRAVEL_S / 2).lift).toBeCloseTo(0.008, 12)
    expect(revealPose(REVEAL_TRAVEL_S).lift).toBeCloseTo(0, 12)
  })

  it('travels with a normalised spring that reaches exactly 1 when travel ends', () => {
    expect(revealPose(0).travel).toBe(0)
    expect(revealPose(0.3).travel).toBeCloseTo(1.0346030661068677, 9)
    expect(revealPose(REVEAL_TRAVEL_S).travel).toBe(1)
    expect(revealPose(10).travel).toBe(1)
  })

  it('dips 1.5 mm into the hole halfway through the contact phase, then rests', () => {
    expect(CONTACT_DIP).toBe(0.0015)
    expect(revealPose(REVEAL_TRAVEL_S).dip).toBeCloseTo(0, 12)
    expect(revealPose(REVEAL_TRAVEL_S + REVEAL_DIP_S / 2).dip).toBeCloseTo(0.0015, 12)
    expect(revealPose(REVEAL_TOTAL_S).dip).toBeCloseTo(0, 12)
    expect(revealPose(REVEAL_TOTAL_S + 1)).toEqual({ travel: 1, lift: 0, dip: 0, done: true })
  })
})

describe('damp and clampDelta', () => {
  it('moves a fraction 1 - exp(-lambda dt) toward the target', () => {
    expect(damp(0, 1, 10, 0.1)).toBeCloseTo(1 - Math.exp(-1), 12)
    expect(damp(5, 5, 10, 0.1)).toBe(5)
  })

  it('caps a long idle gap so demand-mode frames do not jump', () => {
    expect(clampDelta(3)).toBeCloseTo(1 / 30, 12)
    expect(clampDelta(0.01)).toBe(0.01)
    expect(clampDelta(-1)).toBe(0)
  })
})
