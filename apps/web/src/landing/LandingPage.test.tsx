import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useLanding } from '@/state/landing'
import { loadFixture } from '@/state/replay'
import { useSession } from '@/state/session'
import evidenceMd from '@docs/EVIDENCE.md?raw'
import ladderMd from '@docs/brief/Truehand_Scale_and_Build.md?raw'
import { SECTION_ORDER } from './choreography'
import { tableUnder } from './markdownTables'
import { countWord } from './numberWords'
import { LandingPage, PLAY_PACE_MS } from './LandingPage'

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
    vi.unstubAllGlobals()
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

  it('always renders the step-by-step list from the recorded fixture, with no provisional badge', async () => {
    renderLanding()
    await settle()
    const list = screen.getByRole('list', { name: 'Worked example, step by step' })
    expect(within(list).getAllByRole('listitem').length).toBeGreaterThanOrEqual(5)
    expect(list).toHaveTextContent('3.671 volts')
    const badges = screen.getAllByTestId('badge').map((b) => b.textContent)
    expect(badges).not.toContain('PROVISIONAL')
    expect(badges).toContain('SIMULATED')
  })

  it('puts the recorded provenance under the play record: command, short SHA, date, honesty note', async () => {
    const fx = await loadFixture('worked_example')
    const { container } = renderLanding()
    await settle()
    const captions = within(container.querySelector<HTMLElement>('section#play')!)
      .getAllByTestId('caption')
      .map((c) => c.textContent ?? '')
    const line = captions.find((c) => c.startsWith('Recorded by'))
    expect(line).toBeDefined()
    expect(line).toContain(fx.generated_by!)
    expect(line).toContain(fx.git_sha!.slice(0, 7))
    expect(line).not.toContain(fx.git_sha!.slice(0, 8))
    expect(line).toContain(fx.generated_at!.slice(0, 10))
    expect(line).toContain('Preliminary. Not peer reviewed.')
  })

  it('fills the assumed hand model and thresholds from the recorded config everywhere they appear', async () => {
    const { container } = renderLanding()
    await settle()
    const how = within(container.querySelector<HTMLElement>('section#how')!)
    const lines = how.getByRole('list', { name: 'The six lines' }).querySelectorAll('li')
    expect(lines[0]).toHaveTextContent('0.78 same row, 0.08 one row off, 0.03 two rows off')
    expect(lines[4]).toHaveTextContent('> 0.5')
    const problem = within(container.querySelector<HTMLElement>('section#problem')!)
    const caption = problem.getAllByTestId('caption').map((c) => c.textContent).join(' ')
    expect(caption).toMatch(/78%.*8%.*3%/)
    expect(container.querySelector('section#evidence')).toHaveTextContent(
      'three assumed numbers: 0.78, 0.08, 0.03',
    )
  })

  it('tells the thermometer run from its recording, in its own words, under a SIMULATED badge', async () => {
    const { container } = renderLanding()
    await settle()
    const section = within(container.querySelector<HTMLElement>('section#generalize')!)
    expect(section.getAllByTestId('badge').map((b) => b.textContent)).toContain('SIMULATED')
    const list = section.getByRole('list', { name: 'Thermometer example, step by step' })
    expect(list).toHaveTextContent('Insert the probe to 5.5 cm')
    expect(list).toHaveTextContent('degrees Celsius')
    expect(list.textContent).not.toMatch(/fault|volts/i)
  })

  it('takes counts and the employment source from data, not typed copy', async () => {
    const fx = await loadFixture('worked_example')
    const { container } = renderLanding()
    await settle()
    const rungs = tableUnder(ladderMd, 'Scale ladder')!.rows.length
    expect(screen.getByRole('heading', { name: /One engine/ })).toHaveTextContent(
      `One engine, ${countWord(rungs)} rungs.`,
    )
    const pair = fx.catalog.classes.find((c) => c.length > 1)!
    const how = within(container.querySelector<HTMLElement>('section#how')!)
    const refusal = how.getAllByTestId('caption').find((c) => c.textContent?.startsWith('Unresolved'))
    expect(refusal).toHaveTextContent(`Unresolved. ${countWord(pair.length, true)} faults`)
    const source = /\(([^)]*)\)\s*$/.exec(tableUnder(evidenceMd, '3. Employment')!.rows[0]![0]!)![1]!
    const ladder = within(container.querySelector<HTMLElement>('section#ladder')!)
    expect(ladder.getAllByTestId('caption').at(-1)).toHaveTextContent(`Employment figure: ${source}.`)
  })

  it('does not start the replay on render; Play starts it in replay mode and plays', async () => {
    const start = vi.spyOn(useSession.getState(), 'start')
    const replayPlay = vi.spyOn(useSession.getState(), 'replayPlay')
    renderLanding()
    await settle()
    expect(start).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Play the worked example' }))
    await settle()
    expect(start).toHaveBeenCalledWith({ mode: 'replay', fixture: 'worked_example', silent: false })
    await waitFor(() => expect(replayPlay).toHaveBeenCalledWith(4000))
    expect(PLAY_PACE_MS).toBe(4000)
    start.mockRestore()
    replayPlay.mockRestore()
  })

  it('renders no Reduce motion switch of its own (the app shell owns the only one)', async () => {
    renderLanding()
    await settle()
    expect(screen.queryByRole('switch', { name: 'Reduce motion' })).toBeNull()
  })

  it('follows the OS reduced-motion setting through useReducedMotion', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    const { container } = renderLanding()
    await settle()
    expect(container.querySelector('main')).toHaveAttribute('data-reduced', 'true')
  })

  it('names the three play controls exactly as the contract binds them', async () => {
    const { container } = renderLanding()
    await settle()
    const play = within(container.querySelector<HTMLElement>('section#play')!)
    for (const name of ['Play the worked example', 'Pause', 'Replay']) {
      expect(play.getByRole('button', { name })).toBeInTheDocument()
    }
    expect(screen.getAllByRole('button', { name: 'Play the worked example' })).toHaveLength(1)
  })

  it('gives the mast its own uniquely named control that goes to the example and plays it', async () => {
    const replayPlay = vi.spyOn(useSession.getState(), 'replayPlay')
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const { container } = renderLanding()
    await settle()
    const mast = within(container.querySelector<HTMLElement>('section#mast')!)
    fireEvent.click(mast.getByRole('button', { name: 'Go to the worked example and play it' }))
    await settle()
    expect(scrollIntoView).toHaveBeenCalled()
    await waitFor(() => expect(replayPlay).toHaveBeenCalledWith(PLAY_PACE_MS))
    replayPlay.mockRestore()
  })

  it('pauses a replay started on the landing when the landing unmounts', async () => {
    const { unmount } = renderLanding()
    await settle()
    fireEvent.click(screen.getByRole('button', { name: 'Play the worked example' }))
    await settle()
    await waitFor(() => expect(useSession.getState().replay?.autoplay).toBe(true))
    const replayPause = vi.spyOn(useSession.getState(), 'replayPause')
    unmount()
    expect(replayPause).toHaveBeenCalled()
    expect(useSession.getState().replay?.autoplay).toBe(false)
    replayPause.mockRestore()
  })

  it('puts the scene into landing mode while mounted', async () => {
    const { unmount } = renderLanding()
    await settle()
    expect(useLanding.getState().sceneMode).toBe('landing')
    unmount()
    expect(useLanding.getState().sceneMode).toBe('hidden')
  })

  it('never renders a partner or organization name from the brief (rule F21)', async () => {
    const { container } = renderLanding()
    await settle()
    expect(container.textContent ?? '').not.toMatch(
      /Louisiana Rehabilitation|American Printing House|APH\b|Fluke|Snap-on|Trenton Street/,
    )
  })

  it('has no em-dashes or banned phrases in the rendered copy', async () => {
    const { container } = renderLanding()
    await settle()
    const text = container.textContent ?? ''
    expect(text).not.toMatch(/—|Get Started|first ever|Nexus|Read more|Learn more/i)
    expect(text).not.toMatch(/20-second|\b\d+ s\b|\b\d+ seconds?\b/)
  })
})
