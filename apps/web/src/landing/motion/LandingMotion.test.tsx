import { act, render } from '@testing-library/react'
import { useRef } from 'react'
import { gsap, ScrollTrigger } from './scroll'
import LandingMotion from './index'
import { useLanding } from '@/state/landing'

const HEADLINE = 'Measurement you can trust without looking.'
const QUOTE = 'I could not tell which hole the probe was in.'

interface MediaStub {
  reduce: boolean
  wide: boolean
}

// ScrollTrigger reads matchMedia when it registers, so the stub exists before the imports run.
const media = vi.hoisted(() => {
  const stub = { reduce: false, wide: true }
  const matches = (query: string): boolean =>
    query.split(' and ').every((part) => {
      if (part.includes('prefers-reduced-motion: reduce')) return stub.reduce
      if (part.includes('prefers-reduced-motion: no-preference')) return !stub.reduce
      if (part.includes('min-width')) return stub.wide
      if (part.includes('max-width')) return !stub.wide
      return false
    })
  window.matchMedia = (query: string) =>
    ({
      matches: matches(query),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
  return stub
})

function stubMatchMedia(stub: MediaStub): void {
  Object.assign(media, stub)
}

interface FixtureProps {
  stages?: string | undefined
  withMotion?: boolean
}

/** Every hook from UI_CONTRACT 5.3. The edge cell column sits outside <main>, fixed to the page edge as on the page. */
function Fixture({ stages = '0.031,1,0.42', withMotion = true }: FixtureProps) {
  const rootRef = useRef<HTMLElement | null>(null)
  return (
    <>
      <main ref={rootRef}>
        <h1 data-motion="headline">{HEADLINE}</h1>
        <blockquote data-motion="quote">{QUOTE}</blockquote>
        <section id="play">
          <div data-motion="bars">
            <span
              data-motion-bar="published"
              data-motion-stages="0.031,1,1"
              style={{ transform: 'scaleX(1)' }}
            />
            <span
              data-motion-bar="ours"
              data-motion-stages={stages}
              style={{ transform: 'scaleX(0.42)' }}
            />
            <span data-motion-stage-label="0" style={{ opacity: 0 }}>
              Before any reading
            </span>
            <span data-motion-stage-label="2">After reading 2</span>
          </div>
        </section>
        <ul data-motion="rows">
          <li>Circuit</li>
          <li>Thermometer</li>
        </ul>
        <p>
          <span
            data-motion="stat"
            aria-hidden="true"
            data-motion-value="94.2"
            data-motion-decimals="1"
            data-motion-suffix="%"
          >
            94.2%
          </span>
          <span className="sr-only">94.2%</span>
        </p>
        <img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width={1} height={1} />
      </main>
      <div data-motion="plumb" aria-hidden="true">
        <span data-motion-string>
          <span />
          <span />
          <span />
          <span />
        </span>
        <span data-motion-bob />
      </div>
      {withMotion && <LandingMotion rootRef={rootRef} />}
    </>
  )
}

/** The page's final state: the same DOM with no motion mounted. */
function staticHtml(stages?: string): string {
  const { container, unmount } = render(<Fixture stages={stages} withMotion={false} />)
  const html = container.innerHTML
  unmount()
  return html
}

/** Tweens we created. ScrollTrigger's own delayedCalls (their target is a function) do not count. */
function liveTweens() {
  return gsap.globalTimeline
    .getChildren(true, true, true)
    .filter((t) => !(t instanceof gsap.core.Tween && typeof t.targets()[0] === 'function'))
}

function topLevelAnimations() {
  return gsap.globalTimeline
    .getChildren(false, true, true)
    .filter((t) => !(t instanceof gsap.core.Tween && typeof t.targets()[0] === 'function'))
}

function spyCreators() {
  return [
    vi.spyOn(gsap, 'to'),
    vi.spyOn(gsap, 'from'),
    vi.spyOn(gsap, 'fromTo'),
    vi.spyOn(gsap, 'timeline'),
    vi.spyOn(gsap, 'set'),
  ]
}

function totalCalls(spies: ReturnType<typeof spyCreators>): number {
  return spies.reduce((sum, spy) => sum + spy.mock.calls.length, 0)
}

async function setReduceMotion(on: boolean): Promise<void> {
  await act(async () => {
    if (on) document.documentElement.dataset.reduceMotion = 'true'
    else delete document.documentElement.dataset.reduceMotion
    await Promise.resolve()
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  delete document.documentElement.dataset.reduceMotion
  stubMatchMedia({ reduce: false, wide: true })
})

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

  it('starts_the_bars_at_their_first_stage_and_pins_the_section_on_wide_screens', () => {
    const { container } = render(<Fixture />)
    const ours = container.querySelector<HTMLElement>('[data-motion-bar="ours"]')!
    expect(Number(gsap.getProperty(ours, 'scaleX'))).toBeCloseTo(0.031, 6)
    const section = container.querySelector('section#play')
    expect(ScrollTrigger.getAll().some((st) => st.pin === section)).toBe(true)
  })

  it('scrubs_the_bars_without_pinning_on_narrow_screens', () => {
    stubMatchMedia({ reduce: false, wide: false })
    const { container } = render(<Fixture />)
    const ours = container.querySelector<HTMLElement>('[data-motion-bar="ours"]')!
    expect(Number(gsap.getProperty(ours, 'scaleX'))).toBeCloseTo(0.031, 6)
    expect(ScrollTrigger.getAll().length).toBeGreaterThan(0)
    expect(ScrollTrigger.getAll().some((st) => st.pin)).toBe(false)
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
