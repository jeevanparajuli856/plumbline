import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useLanding } from '@/state/landing'
import { useSession } from '@/state/session'
import { SECTION_ORDER } from './choreography'
import { LandingPage, PLAY_PACE_MS } from './LandingPage'
import { useMotionPref } from './motionPref'

vi.mock('@/lib/webgl', () => ({ webglSupported: () => false }))

function renderLanding() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  )
}

async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('LandingPage', () => {
  afterEach(() => {
    useSession.getState().replayPause()
    useMotionPref.getState().setUserReduced(false)
  })

  it('renders the H1, the simulator link and the ten labelled sections in order', async () => {
    const { container } = renderLanding()
    await settle()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Measurement you can trust without looking.',
    )
    expect(screen.getByRole('link', { name: 'Open the simulator' })).toHaveAttribute('href', '/sim')
    const ids = Array.from(container.querySelectorAll('section[aria-labelledby]')).map(
      (el) => el.id,
    )
    expect(ids).toEqual([...SECTION_ORDER])
    for (const id of ids) {
      const section = container.querySelector(`#${id}`)!
      const labelId = section.getAttribute('aria-labelledby')!
      expect(container.querySelector(`#${labelId}`)).not.toBeNull()
    }
  })

  it('gives every section a static mono caption that is not a live region', async () => {
    const { container } = renderLanding()
    await settle()
    for (const id of SECTION_ORDER) {
      const caption = within(container.querySelector<HTMLElement>(`#${id}`)!).queryAllByTestId(
        'caption',
      )
      expect(caption.length).toBeGreaterThan(0)
      for (const c of caption) {
        expect(c).not.toHaveAttribute('aria-live')
        expect(c.closest('[aria-live]')).toBeNull()
      }
    }
  })

  it('always renders the step-by-step list from the fixture, with the provisional badge', async () => {
    renderLanding()
    await settle()
    const list = screen.getByRole('list', { name: 'Worked example, step by step' })
    expect(within(list).getAllByRole('listitem').length).toBeGreaterThanOrEqual(5)
    expect(list).toHaveTextContent('3.671 volts')
    expect(screen.getAllByTestId('badge').some((b) => b.textContent === 'PROVISIONAL')).toBe(true)
    expect(screen.getAllByTestId('badge').some((b) => b.textContent === 'SIMULATED')).toBe(true)
  })

  it('does not start the replay on render; Play starts it in replay mode and plays', async () => {
    const start = vi.spyOn(useSession.getState(), 'start')
    const replayPlay = vi.spyOn(useSession.getState(), 'replayPlay')
    renderLanding()
    await settle()
    expect(start).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Play the 20-second example' }))
    await settle()
    expect(start).toHaveBeenCalledWith({ mode: 'replay', fixture: 'worked_example', silent: false })
    expect(replayPlay).toHaveBeenCalledWith(PLAY_PACE_MS)
    start.mockRestore()
    replayPlay.mockRestore()
  })

  it('offers a Reduce motion switch first in main that toggles and marks the page', async () => {
    const { container } = renderLanding()
    await settle()
    const sw = screen.getByRole('switch', { name: 'Reduce motion' })
    const firstFocusable = container.querySelector('main')!.querySelector('button, a, [tabindex]')
    expect(firstFocusable).toBe(sw)
    expect(sw).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(sw)
    expect(sw).toHaveAttribute('aria-checked', 'true')
    expect(container.querySelector('main')).toHaveAttribute('data-reduced', 'true')
  })

  it('puts the scene into landing mode while mounted', async () => {
    const { unmount } = renderLanding()
    await settle()
    expect(useLanding.getState().sceneMode).toBe('landing')
    unmount()
    expect(useLanding.getState().sceneMode).toBe('hidden')
  })

  it('has no em-dashes or banned phrases in the rendered copy', async () => {
    const { container } = renderLanding()
    await settle()
    const text = container.textContent ?? ''
    expect(text).not.toMatch(/—|Get Started|first ever|Nexus|Read more|Learn more/i)
  })
})
