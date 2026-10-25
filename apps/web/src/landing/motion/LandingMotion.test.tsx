import './testing/media'
import { act, render } from '@testing-library/react'
import { gsap, ScrollTrigger } from './scroll'
import LandingMotion from './index'
import { useLanding } from '@/state/landing'
import { LATE_LOAD_MS } from './constants'
import { resetMatchMedia, stubMatchMedia } from './testing/media'
import { EARLY_MS, HEADLINE, QUOTE } from './testing/content'
import { Fixture } from './testing/Fixture'
import {
  liveTweens,
  setReduceMotion,
  spyCreators,
  staticHtml,
  topLevelAnimations,
  totalCalls,
} from './testing/animations'

// The page just loaded: the motion chunk arrived before the headline counts as painted for long.
beforeEach(() => {
  vi.spyOn(performance, 'now').mockReturnValue(EARLY_MS)
})

afterEach(() => {
  vi.restoreAllMocks()
  delete document.documentElement.dataset.reduceMotion
  resetMatchMedia()
})

/** jsdom lays every box at y 0; put one section well below the first screen, as on the page. */
function belowTheFold(id: string): void {
  const real = Element.prototype.getBoundingClientRect
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this.id !== id) return real.call(this)
    return {
      top: 5000,
      bottom: 5600,
      left: 0,
      right: 800,
      width: 800,
      height: 600,
      x: 0,
      y: 5000,
    } as DOMRect
  })
}

describe('LandingMotion', () => {
  it('renders_nothing_of_its_own', () => {
    stubMatchMedia({ reduce: true, wide: true })
    const { container } = render(<LandingMotion rootRef={{ current: null }} />)
    expect(container.innerHTML).toBe('')
  })

  it('does_nothing_without_a_root', () => {
    const spies = spyCreators()
    render(<LandingMotion rootRef={{ current: null }} />)
    expect(totalCalls(spies)).toBe(0)
  })

  it('creates_no_tween_and_leaves_the_dom_untouched_when_the_os_asks_for_reduced_motion', () => {
    stubMatchMedia({ reduce: true, wide: true })
    const before = staticHtml()
    const spies = spyCreators()
    const { container } = render(<Fixture />)
    expect(totalCalls(spies)).toBe(0)
    expect(liveTweens()).toHaveLength(0)
    expect(ScrollTrigger.getAll()).toHaveLength(0)
    expect(container.innerHTML).toBe(before)
  })

  it('creates_no_tween_and_leaves_the_dom_untouched_when_html_carries_data_reduce_motion', () => {
    document.documentElement.dataset.reduceMotion = 'true'
    const before = staticHtml()
    const spies = spyCreators()
    const { container } = render(<Fixture />)
    expect(totalCalls(spies)).toBe(0)
    expect(liveTweens()).toHaveLength(0)
    expect(ScrollTrigger.getAll()).toHaveLength(0)
    expect(container.innerHTML).toBe(before)
  })

  it('animates_when_motion_is_allowed_and_restores_text_aria_and_styles_exactly_on_unmount', () => {
    const before = staticHtml()
    const { container, unmount } = render(<Fixture />)
    expect(liveTweens().length).toBeGreaterThan(0)
    expect(ScrollTrigger.getAll().length).toBeGreaterThan(0)
    const main = container.querySelector('main')!
    const column = container.querySelector<HTMLElement>('[data-motion="plumb"]')!
    expect(main.querySelector('[data-motion="headline"]')!.querySelectorAll('span')).toHaveLength(6)

    // The detached nodes keep whatever revert left on them; they must match the static page exactly.
    unmount()
    expect(liveTweens()).toHaveLength(0)
    expect(ScrollTrigger.getAll()).toHaveLength(0)
    expect(before).toContain(main.outerHTML)
    expect(before).toContain(column.outerHTML)
  })

  it('reverts_to_the_final_state_at_once_when_the_switch_is_turned_on', async () => {
    const before = staticHtml()
    const { container } = render(<Fixture />)
    expect(container.innerHTML).not.toBe(before)
    await setReduceMotion(true)
    expect(liveTweens()).toHaveLength(0)
    expect(ScrollTrigger.getAll()).toHaveLength(0)
    expect(container.innerHTML).toBe(before)
  })

  it('re_creates_the_motion_when_the_switch_is_turned_off_again', async () => {
    document.documentElement.dataset.reduceMotion = 'true'
    render(<Fixture />)
    expect(liveTweens()).toHaveLength(0)
    await setReduceMotion(false)
    expect(liveTweens().length).toBeGreaterThan(0)
  })

  it('keeps_the_headline_accessible_name_equal_to_the_original_text', () => {
    const { getByRole, container } = render(<Fixture />)
    expect(container.querySelector('[data-motion="headline"] span')).not.toBeNull()
    expect(getByRole('heading', { level: 1, name: HEADLINE })).toBeInTheDocument()
  })

  it('rises_the_headline_when_the_motion_chunk_arrives_early', () => {
    vi.spyOn(performance, 'now').mockReturnValue(LATE_LOAD_MS - 1)
    const { container } = render(<Fixture />)
    const h1 = container.querySelector('[data-motion="headline"]')!
    expect(h1.querySelectorAll('span')).toHaveLength(6)
    expect(h1.getAttribute('aria-label')).toBe(HEADLINE)
  })

  it('leaves_an_already_painted_headline_alone_when_the_motion_chunk_arrives_late', () => {
    vi.spyOn(performance, 'now').mockReturnValue(LATE_LOAD_MS + 1)
    const before = staticHtml()
    const { container } = render(<Fixture />)
    const h1 = container.querySelector('[data-motion="headline"]')!
    expect(h1.childNodes).toHaveLength(1)
    expect(h1.textContent).toBe(HEADLINE)
    expect(h1.hasAttribute('aria-label')).toBe(false)
    expect(h1.getAttribute('style')).toBeNull()
    // Everything below the fold still animates.
    expect(container.querySelector('[data-motion="quote"] span')).not.toBeNull()
    expect(container.innerHTML).not.toBe(before)
  })

  it('leaves_quote_words_readable_by_assistive_technology', () => {
    const { container } = render(<Fixture />)
    const quote = container.querySelector('[data-motion="quote"]')!
    expect(quote.textContent).toBe(QUOTE)
    expect(quote.querySelectorAll('span')).toHaveLength(10)
    expect(quote.querySelector('[aria-hidden]')).toBeNull()
    expect(quote.hasAttribute('aria-label')).toBe(false)
  })

  it('ignores_the_bars_when_their_stages_are_bad', () => {
    const { container } = render(<Fixture stages="0.1,oops,0.3" />)
    const ours = container.querySelector<HTMLElement>('[data-motion-bar="ours"]')!
    const published = container.querySelector<HTMLElement>('[data-motion-bar="published"]')!
    expect(ours.getAttribute('style')).toBe('transform: scaleX(0.42);')
    expect(published.getAttribute('style')).toBe('transform: scaleX(1);')
    expect(ScrollTrigger.getAll().some((st) => st.pin)).toBe(false)
  })

  it.each([
    ['wide', true],
    ['narrow', false],
  ])('never_pins_the_page_while_the_bar_race_scrubs_on_%s_screens', (_label, wide) => {
    stubMatchMedia({ wide })
    belowTheFold('play')
    const { container } = render(<Fixture />)
    const ours = container.querySelector<HTMLElement>('[data-motion-bar="ours"]')!
    expect(Number(gsap.getProperty(ours, 'scaleX'))).toBeCloseTo(0.031, 6)
    expect(ScrollTrigger.getAll().some((st) => st.pin)).toBe(false)
    expect(container.querySelector('section#play')!.getAttribute('style')).toBeNull()
    expect(container.querySelector('.pin-spacer')).toBeNull()
  })

  it('scrubs_the_race_while_section_play_passes_through_the_viewport', () => {
    const { container } = render(<Fixture />)
    const section = container.querySelector('section#play')
    const race = ScrollTrigger.getAll().find((st) => st.trigger === section)!
    expect(race.vars.start).toBe('top 80%')
    expect(race.vars.end).toBe('bottom 40%')
    expect(race.vars.scrub).toBeTruthy()
  })

  it('starts_the_stat_from_zero_and_ends_on_exactly_the_original_text', () => {
    const { container } = render(<Fixture />)
    const stat = container.querySelector('[data-motion="stat"]')!
    expect(stat.textContent).toBe('0.0%')
    topLevelAnimations().forEach((t) => t.progress(1))
    expect(stat.textContent).toBe('94.2%')
  })

  it('ends_the_bar_race_on_the_last_stage_with_only_its_label_shown', () => {
    const { container } = render(<Fixture />)
    topLevelAnimations().forEach((t) => t.progress(1))
    const ours = container.querySelector<HTMLElement>('[data-motion-bar="ours"]')!
    expect(Number(gsap.getProperty(ours, 'scaleX'))).toBeCloseTo(0.42, 6)
    expect(
      gsap.getProperty(container.querySelector('[data-motion-stage-label="2"]')!, 'opacity'),
    ).toBe(1)
    expect(
      gsap.getProperty(container.querySelector('[data-motion-stage-label="0"]')!, 'opacity'),
    ).toBe(0)
  })

  it('wobbles_the_ringed_dot_and_never_moves_the_column', () => {
    const { container } = render(<Fixture />)
    const column = container.querySelector<HTMLElement>('[data-motion="plumb"]')!
    const dot = container.querySelector<HTMLElement>('[data-motion-bob]')!
    const wobbles = topLevelAnimations().filter(
      (t) => t instanceof gsap.core.Tween && t.targets()[0] === dot && t.repeat() === -1,
    )
    expect(wobbles).toHaveLength(2)
    wobbles.forEach((t) => t.progress(1))
    expect(Math.abs(Number(gsap.getProperty(dot, 'xPercent')))).toBeGreaterThan(0)
    expect(Math.abs(Number(gsap.getProperty(dot, 'yPercent')))).toBeGreaterThan(0)
    expect(column.getAttribute('style')).toBeNull()
  })

  it('wobbles_slower_than_once_every_two_and_a_half_seconds', () => {
    const { container } = render(<Fixture />)
    const dot = container.querySelector<HTMLElement>('[data-motion-bob]')!
    const wobbles = topLevelAnimations().filter(
      (t) => t instanceof gsap.core.Tween && t.targets()[0] === dot && t.repeat() === -1,
    )
    // Each wobble is a yoyo, so one full period is two legs.
    wobbles.forEach((t) => expect(t.duration() * 2).toBeGreaterThanOrEqual(2.5))
  })

  it('remeasures_the_holes_on_refresh_and_glides_the_dot_to_the_nearest_one', () => {
    const { container } = render(<Fixture />)
    const dot = container.querySelector<HTMLElement>('[data-motion-bob]')!
    const holes = Array.from(container.querySelector('[data-motion-string]')!.children)
    const box = (top: number) => ({ top, height: 10 }) as DOMRect
    holes.forEach((hole, i) =>
      vi.spyOn(hole, 'getBoundingClientRect').mockReturnValue(box(5 + 20 * i)),
    )
    vi.spyOn(dot, 'getBoundingClientRect').mockReturnValue(box(25))
    act(() => ScrollTrigger.refresh())
    const slide = topLevelAnimations().find(
      (t) => t instanceof gsap.core.Tween && t.targets()[0] === dot && t.repeat() !== -1,
    )!
    slide.progress(1)
    // Page top: the first hole (centre 10), measured from where the dot rests (centre 30).
    expect(Number(gsap.getProperty(dot, 'y'))).toBeCloseTo(-20, 6)
  })

  it('settles_the_wobble_as_landing_progress_rises', () => {
    const { container } = render(<Fixture />)
    const dot = container.querySelector<HTMLElement>('[data-motion-bob]')!
    act(() => useLanding.getState().setProgress(1, 'close'))
    // Finish the amplitude ease first, then render the wobble at its widest point.
    topLevelAnimations().forEach((t) => t.progress(1))
    topLevelAnimations().forEach((t) => t.progress(1))
    expect(Math.abs(Number(gsap.getProperty(dot, 'xPercent')))).toBeLessThan(1e-6)
    expect(Math.abs(Number(gsap.getProperty(dot, 'yPercent')))).toBeLessThan(1e-6)
    act(() => useLanding.getState().setProgress(0, 'mast'))
  })

  it('stops_listening_to_landing_progress_after_unmount', () => {
    const { container, unmount } = render(<Fixture />)
    const dot = container.querySelector<HTMLElement>('[data-motion-bob]')!
    unmount()
    act(() => useLanding.getState().setProgress(0.5, 'how'))
    expect(liveTweens()).toHaveLength(0)
    expect(dot.getAttribute('style')).toBeNull()
    act(() => useLanding.getState().setProgress(0, 'mast'))
  })

  it('refreshes_scroll_positions_after_fonts_and_late_images_load', async () => {
    let resolveFonts: () => void = () => {}
    const ready = new Promise<void>((resolve) => {
      resolveFonts = resolve
    })
    Object.defineProperty(document, 'fonts', { value: { ready }, configurable: true })
    const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false)
    const refresh = vi.spyOn(ScrollTrigger, 'refresh')
    const { container } = render(<Fixture />)
    complete.mockRestore()

    await act(async () => {
      resolveFonts()
      await ready
    })
    expect(refresh).toHaveBeenCalledTimes(1)
    container.querySelector('img')!.dispatchEvent(new Event('load'))
    expect(refresh).toHaveBeenCalledTimes(2)
    Reflect.deleteProperty(document, 'fonts')
  })
})
