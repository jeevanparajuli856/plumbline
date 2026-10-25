import './testing/media'
import { act, render } from '@testing-library/react'
import { gsap } from './scroll'
import {
  DEVICE_FLOAT_ROTATE_X_DEG,
  DEVICE_FLOAT_ROTATE_Y_DEG,
  DEVICE_FLOAT_Y_PX,
  DEVICE_POINTER_TILT_DEG,
  DEVICE_SCROLL_TILT_DEG,
  HEADLINE_SKEW_DEG,
  LATE_LOAD_MS,
  PARALLAX_RANGE_PX,
  REVEAL_RISE_PX,
  REVEAL_STAGGER_S,
  STAT_EASE,
} from './constants'
import { resetMatchMedia, stubMatchMedia } from './testing/media'
import { EARLY_MS } from './testing/content'
import { Fixture } from './testing/Fixture'
import { liveTweens, spyCreators, totalCalls, tweensOf } from './testing/animations'

function num(el: Element, prop: string): number {
  return Number(gsap.getProperty(el, prop))
}

/** Plays every tween on `el` to its end, twice, so quickTo chases settle after the intro. */
function finish(el: Element): void {
  tweensOf(el).forEach((t) => t.progress(1))
  tweensOf(el).forEach((t) => t.progress(1))
}

function byTestId(container: HTMLElement, id: string): HTMLElement {
  return container.querySelector<HTMLElement>(`[data-testid="${id}"]`)!
}

beforeEach(() => {
  vi.spyOn(performance, 'now').mockReturnValue(EARLY_MS)
})

afterEach(() => {
  vi.restoreAllMocks()
  delete document.documentElement.dataset.reduceMotion
  resetMatchMedia()
})

describe('reveal', () => {
  it('reveals_up_blocks_from_32px_below_with_a_fade', () => {
    const { container } = render(<Fixture />)
    const block = container.querySelector('[data-motion="reveal"]:not([data-motion-reveal])')!
    expect(num(block, 'y')).toBe(REVEAL_RISE_PX)
    expect(num(block, 'opacity')).toBe(0)
    finish(block)
    expect(num(block, 'y')).toBe(0)
    expect(num(block, 'opacity')).toBe(1)
  })

  it('keeps_revealed_blocks_in_the_accessibility_tree_and_tab_order', () => {
    const { container } = render(<Fixture />)
    container
      .querySelectorAll<HTMLElement>('[data-motion="reveal"], [data-motion-item]')
      .forEach((el) => {
        expect(el.style.visibility).toBe('')
      })
  })

  it('shows_a_waiting_block_at_once_when_focus_moves_into_it', () => {
    const { container } = render(<Fixture />)
    const block = container.querySelector('[data-motion="reveal"]:not([data-motion-reveal])')!
    act(() => block.querySelector('a')!.focus())
    expect(num(block, 'opacity')).toBe(1)
    expect(num(block, 'y')).toBe(0)
  })

  it('reveals_mask_blocks_with_a_bottom_to_top_clip_and_drops_the_clip_when_done', () => {
    const { container } = render(<Fixture />)
    const block = container.querySelector<HTMLElement>('[data-motion-reveal="mask"]')!
    expect(block.style.clipPath).toMatch(/^inset\(100%/)
    finish(block)
    expect(block.style.clipPath).toBe('')
  })

  it('rises_stagger_items_in_sequence', () => {
    const { container } = render(<Fixture />)
    const items = Array.from(container.querySelectorAll('[data-motion-item]'))
    const [tween] = tweensOf(items[0]!)
    expect(tween!.targets()).toEqual(items)
    expect(tween!.vars.stagger).toBe(REVEAL_STAGGER_S)
    items.forEach((item) => expect(num(item, 'opacity')).toBe(0))
  })
})

describe('device', () => {
  it('floats_the_device_in_with_a_perspective_tilt_on_load', () => {
    const { container } = render(<Fixture />)
    const device = container.querySelector('[data-motion="device"]')!
    expect(num(device, 'y')).toBe(DEVICE_FLOAT_Y_PX)
    expect(num(device, 'rotationX')).toBe(DEVICE_FLOAT_ROTATE_X_DEG)
    expect(num(device, 'rotationY')).toBe(DEVICE_FLOAT_ROTATE_Y_DEG)
    expect(byTestId(container, 'device-parent').style.perspective).not.toBe('')
    finish(device)
    expect(num(device, 'y')).toBe(0)
    expect(Math.abs(num(device, 'rotationY'))).toBeLessThan(1e-6)
  })

  it('tilts_the_device_with_scroll_within_six_degrees', () => {
    const { container } = render(<Fixture />)
    const device = container.querySelector('[data-motion="device"]')!
    finish(device)
    expect(Math.abs(num(device, 'rotationX'))).toBeLessThanOrEqual(DEVICE_SCROLL_TILT_DEG)
  })

  it('leans_toward_a_fine_pointer_within_four_degrees', () => {
    stubMatchMedia({ finePointer: true })
    const { container } = render(<Fixture />)
    const device = container.querySelector('[data-motion="device"]')!
    finish(device)
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 99_999, clientY: 0 }))
    })
    finish(device)
    expect(num(device, 'rotationY')).toBeCloseTo(DEVICE_POINTER_TILT_DEG, 6)
  })

  it('ignores_the_pointer_on_coarse_pointers', () => {
    stubMatchMedia({ finePointer: false })
    const { container } = render(<Fixture />)
    const device = container.querySelector('[data-motion="device"]')!
    finish(device)
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 99_999, clientY: 0 }))
    })
    finish(device)
    expect(Math.abs(num(device, 'rotationY'))).toBeLessThan(1e-6)
  })

  it('never_moves_the_screen_inside_the_device', () => {
    stubMatchMedia({ finePointer: true })
    const { container } = render(<Fixture />)
    const device = container.querySelector('[data-motion="device"]')!
    finish(device)
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 10, clientY: 10 }))
    })
    finish(device)
    expect(byTestId(container, 'screen').getAttribute('style')).toBeNull()
    expect(tweensOf(byTestId(container, 'screen'))).toHaveLength(0)
  })

  it('leaves_the_device_in_place_when_the_motion_chunk_arrives_late', () => {
    vi.spyOn(performance, 'now').mockReturnValue(LATE_LOAD_MS + 1)
    const { container } = render(<Fixture />)
    const device = container.querySelector('[data-motion="device"]')!
    expect(num(device, 'y')).toBe(0)
    expect(num(device, 'opacity')).toBe(1)
  })

  it('restores_the_device_and_its_parent_exactly_on_unmount', () => {
    stubMatchMedia({ finePointer: true })
    const { container, unmount } = render(<Fixture />)
    const device = container.querySelector('[data-motion="device"]')!
    const parent = byTestId(container, 'device-parent')
    unmount()
    expect(device.getAttribute('style')).toBeNull()
    expect(parent.getAttribute('style')).toBeNull()
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 10, clientY: 10 }))
    expect(liveTweens()).toHaveLength(0)
  })
})

describe('parallax', () => {
  it('drifts_parallax_layers_with_scroll_by_their_depth', () => {
    const { container } = render(<Fixture />)
    const layer = byTestId(container, 'layer')
    const [drift] = tweensOf(layer)
    expect(drift!.scrollTrigger?.vars.scrub).toBeTruthy()
    drift!.progress(0)
    expect(num(layer, 'y')).toBeCloseTo(0.2 * PARALLAX_RANGE_PX, 6)
    drift!.progress(1)
    expect(num(layer, 'y')).toBeCloseTo(-0.2 * PARALLAX_RANGE_PX, 6)
  })

  it('ignores_parallax_layers_without_a_usable_depth', () => {
    const { container } = render(<Fixture />)
    const flat = byTestId(container, 'flat-layer')
    expect(tweensOf(flat)).toHaveLength(0)
    expect(flat.getAttribute('style')).toBeNull()
  })
})

describe('polish', () => {
  it('skews_the_headline_words_in_and_ends_upright', () => {
    const { container } = render(<Fixture />)
    const word = container.querySelector('[data-motion="headline"] span')!
    expect(num(word, 'skewY')).toBe(HEADLINE_SKEW_DEG)
    tweensOf(word).forEach((t) => t.progress(1))
    expect(num(word, 'skewY')).toBe(0)
  })

  it('never_shows_a_stat_above_its_measured_value_during_the_overshoot', () => {
    const { container } = render(<Fixture />)
    const stat = container.querySelector('[data-motion="stat"]')!
    const counter = liveTweens().find((t) => t.vars.ease === STAT_EASE)!
    for (let step = 0; step <= 50; step += 1) {
      counter.progress(step / 50)
      expect(Number.parseFloat(stat.textContent ?? '')).toBeLessThanOrEqual(94.2)
    }
    expect(stat.textContent).toBe('94.2%')
  })

  it('keeps_product_rows_readable_while_they_slide_in', () => {
    const { container } = render(<Fixture />)
    container.querySelectorAll<HTMLElement>('[data-motion="rows"] > li').forEach((li) => {
      expect(li.style.visibility).toBe('')
      expect(num(li, 'opacity')).toBe(0)
      expect(num(li, 'x')).toBeLessThan(0)
    })
  })
})

describe('reduced motion', () => {
  it('creates_no_reveal_device_or_parallax_tween_under_reduced_motion', () => {
    stubMatchMedia({ reduce: true, finePointer: true })
    const spies = spyCreators()
    const { container } = render(<Fixture />)
    expect(totalCalls(spies)).toBe(0)
    const hooked = container.querySelectorAll(
      '[data-motion="reveal"], [data-motion-item], [data-motion="device"], [data-motion="parallax"]',
    )
    hooked.forEach((el) => expect(el.getAttribute('style')).toBeNull())
    expect(byTestId(container, 'device-parent').getAttribute('style')).toBeNull()
  })
})
