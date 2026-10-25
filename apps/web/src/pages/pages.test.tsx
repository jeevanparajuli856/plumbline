import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { EDGE_HOLE_COUNT } from '@/landing/EdgeColumn'
import { PRODUCT_LINE, STATUS_LINE, VALIDATION_STATS } from '@/landing/content'
import { INITIAL_HERO_STATE, useHeroLoop } from '@/landing/heroLoop'
import { PLAY_PACE_MS } from '@/landing/useWorkedReplay'
import { useLanding } from '@/state/landing'
import { loadFixture } from '@/state/replay'
import { useSession } from '@/state/session'
import { AccessibilityPage } from './AccessibilityPage'
import { AppPage } from './AppPage'
import { HomePage } from './HomePage'
import { HowItWorksPage } from './HowItWorksPage'

vi.mock('@/lib/webgl', () => ({ webglSupported: () => false }))
// GSAP motion has its own tests (landing/motion); pages render without it here.
vi.mock('@/landing/motion', () => ({ default: () => null }))

function renderPage(page: ReactElement) {
  return render(<MemoryRouter>{page}</MemoryRouter>)
}

async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

function sectionIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('main > section[aria-labelledby]')).map(
    (el) => el.id,
  )
}

function expectLabelledSections(container: HTMLElement, ids: readonly string[]) {
  expect(sectionIds(container)).toEqual([...ids])
  for (const id of ids) {
    const labelId = container.querySelector(`#${id}`)!.getAttribute('aria-labelledby')!
    expect(container.querySelector(`#${labelId}`)).not.toBeNull()
  }
  for (const caption of screen.queryAllByTestId('caption')) {
    expect(caption).not.toHaveAttribute('aria-live')
    expect(caption.closest('[aria-live]')).toBeNull()
  }
}

function stubReducedMotion() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

beforeEach(() => useHeroLoop.setState({ state: INITIAL_HERO_STATE }))
afterEach(() => {
  useSession.getState().replayPause()
  vi.unstubAllGlobals()
})

describe('Home', () => {
  it('renders the promise, the product line, the two exits and six labelled sections', async () => {
    const { container } = renderPage(<HomePage />)
    await settle()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Measurement you can trust without looking.',
    )
    const main = screen.getByRole('main')
    const tryLinks = within(main).getAllByRole('link', { name: 'Try Truehand' })
    expect(tryLinks.length).toBeGreaterThan(0)
    for (const link of tryLinks) expect(link).toHaveAttribute('href', '/sim')
    expect(within(main).getByRole('link', { name: 'See how it works' })).toHaveAttribute(
      'href',
      '/how-it-works',
    )
    expect(main).toHaveTextContent(PRODUCT_LINE)
    expect(main).not.toHaveTextContent(STATUS_LINE)
    expectLabelledSections(container, ['hero', 'problem', 'outcomes', 'proof', 'audience', 'cta'])
    expect(container.querySelector('section#hero img')).toBeNull()
  })

  it('keeps the headline plain text and renders the edge cell column with an HTML found dot', async () => {
    const { container } = renderPage(<HomePage />)
    await settle()
    const h1 = container.querySelector('h1')!
    expect(h1).toHaveAttribute('data-motion', 'headline')
    expect(h1.childElementCount).toBe(0)
    const column = container.querySelector('[data-motion="plumb"]')!
    expect(column).toHaveAttribute('aria-hidden', 'true')
    expect(column.querySelector('[data-motion-string]')!.children).toHaveLength(EDGE_HOLE_COUNT)
    expect(column.querySelector('[data-motion-bob]')).toBeInstanceOf(HTMLElement)
  })

  it('shows two simulated proof numbers with counting hooks and sr-only twins', async () => {
    const { container } = renderPage(<HomePage />)
    await settle()
    const hooks = Array.from(
      container.querySelectorAll<HTMLElement>('section#proof [data-motion="stat"]'),
    )
    expect(hooks).toHaveLength(2)
    for (const el of hooks) {
      expect(el).toHaveAttribute('aria-hidden', 'true')
      expect(el.nextElementSibling).toHaveClass('sr-only')
      expect(el.nextElementSibling).toHaveTextContent(el.textContent!)
      expect(el.closest('li')).toHaveTextContent(/Simulated, [\d,]+ runs, October 2026/)
    }
    expect(screen.getByRole('link', { name: 'See the evidence' })).toHaveAttribute(
      'href',
      '/evidence',
    )
  })

  it('never mounts the 3D scene', async () => {
    renderPage(<HomePage />)
    await settle()
    expect(useLanding.getState().sceneMode).toBe('hidden')
  })
})

describe('Home live instrument card', () => {
  function card() {
    return within(document.querySelector<HTMLElement>('section#hero')!).getByRole('group', {
      name: 'Live instrument',
    })
  }

  it('plays recorded simulated runs and never starts the session store', async () => {
    const start = vi.spyOn(useSession.getState(), 'start')
    renderPage(<HomePage />)
    await waitFor(() =>
      expect(within(card()).getByTestId('caption')).toHaveTextContent(
        /^Recording the worked example, simulated hand, /,
      ),
    )
    expect(card()).toHaveTextContent('Simulated run')
    expect(card()).toHaveTextContent('Truehand')
    expect(within(card()).getAllByRole('button')).toHaveLength(1)
    // The two app buttons drawn on the screen are pictures, never controls.
    expect(within(card()).queryByRole('button', { name: /Say reading|Type reading/ })).toBeNull()
    expect(start).not.toHaveBeenCalled()
    start.mockRestore()
  })

  it('holds on hover and focus without renaming the button; one click pauses for good', async () => {
    renderPage(<HomePage />)
    const button = await within(card()).findByRole('button', { name: 'Pause' })
    await waitFor(() => expect(card()).toHaveAttribute('data-running', 'true'))
    fireEvent.pointerEnter(card())
    expect(card()).toHaveAttribute('data-running', 'false')
    act(() => button.focus())
    expect(button).toHaveAccessibleName('Pause')
    fireEvent.click(button)
    expect(button).toHaveAccessibleName('Play')
    fireEvent.pointerLeave(card())
    act(() => button.blur())
    expect(button).toHaveAccessibleName('Play')
    expect(card()).toHaveAttribute('data-running', 'false')
  })

  it('shows the worked example final state with Play under reduced motion', async () => {
    stubReducedMotion()
    const fx = await loadFixture('worked_example')
    renderPage(<HomePage />)
    const n = fx.steps.length
    await waitFor(() =>
      expect(within(card()).getByTestId('caption')).toHaveTextContent(
        `Recording the worked example, simulated hand, reading ${n} of ${n}`,
      ),
    )
    expect(within(card()).getByRole('button', { name: 'Play' })).toBeInTheDocument()
  })
})

describe('How it works', () => {
  it('has four labelled sections, the contract play controls and both step lists', async () => {
    const { container } = renderPage(<HowItWorksPage />)
    await settle()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expectLabelledSections(container, ['intro', 'play', 'refusal', 'domains'])
    const play = within(container.querySelector<HTMLElement>('section#play')!)
    for (const name of ['Play the worked example', 'Pause', 'Replay']) {
      expect(play.getByRole('button', { name })).toBeInTheDocument()
    }
    const list = play.getByRole('list', { name: 'Worked example, step by step' })
    expect(list).toHaveTextContent('3.671 volts')
    const domains = within(container.querySelector<HTMLElement>('section#domains')!)
    expect(domains.getAllByTestId('badge').map((b) => b.textContent)).toContain('SIMULATED')
    expect(
      domains.getByRole('list', { name: 'Thermometer example, step by step' }),
    ).toHaveTextContent('degrees Celsius')
  })

  it('is the only page that mounts the scene, and only while mounted', async () => {
    const { unmount } = renderPage(<HowItWorksPage />)
    await settle()
    expect(useLanding.getState().sceneMode).toBe('landing')
    unmount()
    expect(useLanding.getState().sceneMode).toBe('hidden')
  })

  it('does not autoplay; Play starts the recorded replay at the reading pace', async () => {
    const start = vi.spyOn(useSession.getState(), 'start')
    const replayPlay = vi.spyOn(useSession.getState(), 'replayPlay')
    renderPage(<HowItWorksPage />)
    await settle()
    expect(start).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Play the worked example' }))
    await waitFor(() => expect(replayPlay).toHaveBeenCalledWith(PLAY_PACE_MS))
    expect(start).toHaveBeenCalledWith({ mode: 'replay', fixture: 'worked_example', silent: false })
    start.mockRestore()
    replayPlay.mockRestore()
  })

  it('pauses a replay started here when the page unmounts', async () => {
    const { unmount } = renderPage(<HowItWorksPage />)
    await settle()
    fireEvent.click(screen.getByRole('button', { name: 'Play the worked example' }))
    await waitFor(() => expect(useSession.getState().replay?.autoplay).toBe(true))
    unmount()
    expect(useSession.getState().replay?.autoplay).toBe(false)
  })

  it('renders the race hooks with recorded stages and indexed stage labels', async () => {
    const fx = await loadFixture('worked_example')
    const { container } = renderPage(<HowItWorksPage />)
    await settle()
    const play = container.querySelector('section#play')!
    expect(play).toHaveAttribute('data-motion', 'bars')
    const ours = play.querySelector<HTMLElement>('[data-motion-bar="ours"]')!
    const stages = ours.dataset.motionStages!.split(',').map(Number)
    expect(stages).toHaveLength(fx.steps.length + 1)
    expect(stages.at(-1)).toBeCloseTo(fx.steps.at(-1)!.diagnosis!.confidence, 3)
    const labels = Array.from(
      ours.parentElement!.parentElement!.querySelectorAll<HTMLElement>('[data-motion-stage-label]'),
    )
    expect(labels.map((l) => l.dataset.motionStageLabel)).toEqual(['0', '1', '2'])
    expect(play).toHaveTextContent('Recorded run, simulated hand, October 2026.')
  })
})

describe('The app', () => {
  it('names the product, lists three modes as motion rows and keeps the phone contract', async () => {
    const { container } = renderPage(<AppPage />)
    await settle()
    expect(screen.getByRole('main')).toHaveTextContent(PRODUCT_LINE)
    expectLabelledSections(container, ['app', 'modes', 'phone', 'buyers', 'cta'])
    expect(container.querySelector('[data-motion="rows"]')!.children).toHaveLength(3)
    const phone = screen.getByRole('group', { name: 'Phone preview of the text channel' })
    expect(phone).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next recorded reading' })).toBeInTheDocument()
  })

  it('mirrors the recorded runs two steps behind, then lets the reader step the session', async () => {
    renderPage(<AppPage />)
    const phone = screen.getByRole('group', { name: 'Phone preview of the text channel' })
    await waitFor(() => expect(useHeroLoop.getState().state.total).toBeGreaterThan(0))
    // Tick 3 is seed_1 before any reading; two ticks earlier is the worked example's first reading.
    act(() =>
      useHeroLoop.setState((st) => ({ state: { ...st.state, tick: 3, isButtonPaused: true } })),
    )
    await waitFor(() => expect(phone).toHaveTextContent('3.671 V'))
    expect(phone).toHaveTextContent('Simulated run')
    expect(phone).toHaveTextContent('Warning.')
    const replayNext = vi.spyOn(useSession.getState(), 'replayNext')
    fireEvent.click(screen.getByRole('button', { name: 'Next recorded reading' }))
    await waitFor(() => expect(replayNext).toHaveBeenCalled())
    replayNext.mockRestore()
  })
})

describe('Accessibility', () => {
  it('holds the real display controls in section#settings', async () => {
    const { container } = renderPage(<AccessibilityPage />)
    await settle()
    expectLabelledSections(container, ['commitment', 'settings', 'support'])
    const settings = within(container.querySelector<HTMLElement>('section#settings')!)
    const theme = settings.getByRole('radiogroup', { name: 'Theme' })
    expect(
      within(theme)
        .getAllByRole('radio')
        .map((r) => r.textContent?.trim()),
    ).toEqual(expect.arrayContaining(['System', 'Light', 'Dark', 'High contrast']))
    expect(settings.getByRole('switch', { name: 'Text only' })).toBeInTheDocument()
    expect(settings.getByRole('switch', { name: 'Reduce motion' })).toBeInTheDocument()
    expect(VALIDATION_STATS.length).toBeGreaterThan(0)
  })
})
