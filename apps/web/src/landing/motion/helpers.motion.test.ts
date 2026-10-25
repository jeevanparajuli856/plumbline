import { clampCount, deviceTilt, parseDepth, revealVariant } from './helpers'
import {
  DEVICE_POINTER_TILT_DEG,
  DEVICE_SCROLL_TILT_DEG,
  PARALLAX_MAX_DEPTH,
  PARALLAX_MIN_DEPTH,
  REVEAL_STAGGER_S,
} from './constants'

describe('revealVariant', () => {
  it.each([
    ['up', 'up'],
    ['mask', 'mask'],
    ['stagger', 'stagger'],
    [' mask ', 'mask'],
  ])('reads_%s', (raw, expected) => {
    expect(revealVariant(raw)).toBe(expected)
  })

  it('defaults_to_up_for_missing_or_unknown_values', () => {
    expect(revealVariant(null)).toBe('up')
    expect(revealVariant('')).toBe('up')
    expect(revealVariant('spin')).toBe('up')
  })

  it('staggers_items_between_60_and_90_ms_apart', () => {
    expect(REVEAL_STAGGER_S).toBeGreaterThanOrEqual(0.06)
    expect(REVEAL_STAGGER_S).toBeLessThanOrEqual(0.09)
  })
})

describe('parseDepth', () => {
  it('keeps_depths_inside_the_contract_range', () => {
    expect(parseDepth('0.15')).toBe(0.15)
  })

  it('clamps_depths_outside_the_contract_range', () => {
    expect(parseDepth('0.01')).toBe(PARALLAX_MIN_DEPTH)
    expect(parseDepth('9')).toBe(PARALLAX_MAX_DEPTH)
  })

  it.each([
    ['missing', null],
    ['empty', ''],
    ['not a number', 'deep'],
    ['zero', '0'],
    ['negative', '-0.2'],
    ['infinite', 'Infinity'],
  ])('rejects_%s', (_label, raw) => {
    expect(parseDepth(raw)).toBeNull()
  })
})

describe('clampCount', () => {
  it('never_passes_the_measured_value_during_an_overshoot', () => {
    expect(clampCount(97.3, 94.2)).toBe(94.2)
  })

  it('never_drops_below_zero', () => {
    expect(clampCount(-0.4, 94.2)).toBe(0)
  })

  it('passes_values_in_between_through', () => {
    expect(clampCount(50, 94.2)).toBe(50)
  })

  it('clamps_toward_negative_targets_too', () => {
    expect(clampCount(-12, -10)).toBe(-10)
    expect(clampCount(2, -10)).toBe(0)
  })
})

describe('deviceTilt', () => {
  it('tilts_back_at_the_top_of_its_section_and_forward_at_the_bottom', () => {
    expect(deviceTilt(0, null)).toEqual({ rotationX: DEVICE_SCROLL_TILT_DEG, rotationY: 0 })
    expect(deviceTilt(1, null)).toEqual({ rotationX: -DEVICE_SCROLL_TILT_DEG, rotationY: 0 })
    expect(deviceTilt(0.5, null).rotationX).toBeCloseTo(0, 9)
  })

  it('leans_toward_the_pointer_within_its_own_limit', () => {
    const tilt = deviceTilt(0.5, { x: 1, y: 0 })
    expect(tilt.rotationY).toBe(DEVICE_POINTER_TILT_DEG)
    expect(deviceTilt(0.5, { x: -1, y: 0 }).rotationY).toBe(-DEVICE_POINTER_TILT_DEG)
  })

  it('tips_the_top_toward_a_pointer_above_the_centre', () => {
    expect(deviceTilt(0.5, { x: 0, y: -1 }).rotationX).toBe(DEVICE_POINTER_TILT_DEG)
  })

  it('keeps_the_combined_tilt_within_the_scroll_limit', () => {
    expect(deviceTilt(0, { x: 0, y: -1 }).rotationX).toBe(DEVICE_SCROLL_TILT_DEG)
    expect(deviceTilt(1, { x: 0, y: 1 }).rotationX).toBe(-DEVICE_SCROLL_TILT_DEG)
  })

  it('clamps_out_of_range_inputs', () => {
    expect(deviceTilt(5, { x: 7, y: 0 })).toEqual({
      rotationX: -DEVICE_SCROLL_TILT_DEG,
      rotationY: DEVICE_POINTER_TILT_DEG,
    })
    expect(deviceTilt(Number.NaN, null).rotationX).toBe(DEVICE_SCROLL_TILT_DEG)
  })
})
