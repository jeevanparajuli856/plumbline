import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyQueue, readQueue, replaceQueue } from '@/a11y/liveQueue'
import { registerShortcut } from '@/a11y/shortcutRegistry'
import { useShortcutPref } from '@/a11y/shortcutPref'
import { usePrefs } from '@/state/prefs'
import { useSession } from '@/state/session'
import { SimPage } from './SimPage'
import { requestViewReset } from '@/scene/viewControl'
import { catalogFromFixture, loadFixture } from '@/state/replay'

vi.mock('@/scene/viewControl', () => ({ requestViewReset: vi.fn() }))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
  HTMLFormElement.prototype.requestSubmit = function requestSubmit(this: HTMLFormElement) {
    this.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  }
})

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Promise.reject(new TypeError('offline'))),
  )
  replaceQueue(emptyQueue)
  usePrefs.setState({ voiceEnabled: false, textOnly: false })
})

afterEach(() => vi.unstubAllGlobals())

function renderSim(url = '/sim?demo=worked-example') {
  const router = createMemoryRouter([{ path: '/sim', Component: SimPage }], {
    initialEntries: [url],
  })
  render(<RouterProvider router={router} />)
  return router
}

const press = (key: string) =>
  act(() => void window.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true })))

async function ready() {
  await screen.findByTestId('instruction')
}

describe('SimPage', () => {
  it('offers Say reading next to Submit reading, once, inside the reading form', async () => {
    renderSim()
    await ready()
    const form = screen.getByRole('button', { name: 'Submit reading' }).closest('form')!
    expect(within(form).getByRole('button', { name: /Say reading/ })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Say reading/ })).toHaveLength(1)
  })

  it('starts on the instruction with every contract element present', async () => {
    renderSim()
    await ready()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Touch the red probe to row 3.',
    )
    expect(screen.getByLabelText('Meter reading in volts')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit reading' })).toBeEnabled()
    expect(screen.getByRole('figure', { name: 'Belief over faults' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Belief over faults' })).toHaveTextContent(
      'Published method',
    )
    expect(
      within(screen.getByRole('list', { name: 'Where the probe landed' })).getAllByRole('listitem'),
    ).toHaveLength(6)
    expect(screen.getByRole('table', { name: 'Reading log' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Mode' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Instrument' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Speech' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByTestId('api-status')).toHaveTextContent('waking up')
    // Engine recordings carry provenance, so no PROVISIONAL badge is shown.
    expect(screen.queryAllByTestId('badge').map((b) => b.textContent)).not.toContain('PROVISIONAL')
    const slot = document.getElementById('scene-slot')
    expect(slot).toBeEmptyDOMElement()
    expect(slot?.className).toMatch(/aspect-\[16\/10\]/)
    expect(slot?.className).toContain('min-h-60')
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }))
    expect(requestViewReset).toHaveBeenCalledOnce()
  })

  it('runs the worked example by keyboard: warning, diagnosis, back a step, reset', async () => {
    renderSim()
    await ready()
    press(']')
    const banner = await screen.findByTestId('warning-banner')
    expect(banner).toHaveAttribute('role', 'region')
    expect(banner).toHaveAccessibleName('Placement warning')
    expect(banner.textContent?.startsWith('Warning.')).toBe(true)
    expect(banner).toHaveTextContent('row 2')
    await waitFor(() => expect(document.activeElement).toBe(banner))
    const log = screen.getByRole('table', { name: 'Reading log' })
    expect(within(log).getAllByRole('row')).toHaveLength(2)
    expect(log).toHaveTextContent('3.671 V')

    press(']')
    const diagnosis = await screen.findByRole('region', { name: 'Diagnosis' })
    expect(diagnosis).toHaveTextContent('R3 is ten times too small')
    // The published method's answer after the last reading, read from the recording.
    const fx = await loadFixture('worked_example')
    const baselineTop = fx.steps[fx.steps.length - 1]!.baseline.top
    expect(diagnosis).toHaveTextContent(
      catalogFromFixture(fx).hypotheses.find((h) => h.id === baselineTop)!.label,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('R3 is ten times too small')
    await waitFor(() => expect(document.activeElement).toBe(diagnosis))

    press('[')
    await screen.findByTestId('warning-banner')
    expect(useSession.getState().replay?.stepIndex).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    await waitFor(() => expect(useSession.getState().readings).toHaveLength(0))
    expect(screen.queryByTestId('warning-banner')).not.toBeInTheDocument()
  })

  it('submits a typed reading and shows a sentence for bad input', async () => {
    renderSim()
    await ready()
    const input = screen.getByLabelText('Meter reading in volts')
    fireEvent.change(input, { target: { value: 'abc' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit reading' }))
    expect(screen.getByRole('alert')).toHaveTextContent('That is not a number')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    fireEvent.change(input, { target: { value: '3.671' } })
    fireEvent.submit(input.closest('form')!)
    await screen.findByTestId('warning-banner')
  })

  it('handles the single-key map: T, V, L, R, P, ?, Esc, digits and the registry for M', async () => {
    renderSim()
    await ready()
    press('t')
    expect(document.activeElement).toBe(screen.getByLabelText('Meter reading in volts'))
    act(() => (document.activeElement as HTMLElement).blur())

    press('v')
    expect(usePrefs.getState().voiceEnabled).toBe(true)
    press('v')

    press('l')
    expect(screen.getByRole('button', { name: 'Show reading log' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    press('l')

    press('r')
    expect(readQueue().last?.text).toBe('Touch the red probe to row 3. Say or type the reading.')
    replaceQueue(emptyQueue)
    fireEvent.click(screen.getByRole('button', { name: 'Repeat instruction' }))
    expect(readQueue().last?.text).toBe('Touch the red probe to row 3. Say or type the reading.')

    press('2')
    expect(useSession.getState().aimedSite).toBe(1)
    const strip = screen.getByRole('list', { name: 'Where the probe landed' })
    expect(within(strip).getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'true')
    fireEvent.click(within(strip).getByRole('button', { name: 'Aim at row 5' }))
    expect(useSession.getState().aimedSite).toBe(4)

    press('?')
    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toHaveAttribute('open')
    act(() => void screen.getByRole('dialog').dispatchEvent(new Event('cancel')))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { hidden: true })).not.toHaveAttribute('open'),
    )

    const listen = vi.fn()
    const unregister = registerShortcut('listen', listen)
    press('m')
    expect(listen).toHaveBeenCalledOnce()
    unregister()

    press('p')
    expect(useSession.getState().replay?.autoplay).toBe(true)
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    press('p')
    expect(useSession.getState().replay?.autoplay).toBe(false)

    press('Enter')
    expect(screen.getByRole('alert')).toHaveTextContent('Type the reading in volts first.')
  })

  it('ignores the keyboard map while the shortcuts dialog is open', async () => {
    renderSim()
    await ready()
    press('?')
    press(']')
    expect(useSession.getState().readings).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    press(']')
    await screen.findByTestId('warning-banner')
  })

  it('turns single-key shortcuts off from the dialog but keeps Enter', async () => {
    renderSim()
    await ready()
    press('?')
    fireEvent.click(screen.getByRole('switch', { name: 'Single-key shortcuts' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    press(']')
    expect(useSession.getState().readings).toHaveLength(0)
    press('Enter')
    expect(screen.getByRole('alert')).toHaveTextContent('Type the reading in volts first.')
    useShortcutPref.getState().setSingleKeys(true)
  })

  it('disables Previous and ignores ] and P while a rewind is running', async () => {
    renderSim()
    await ready()
    press(']')
    await screen.findByTestId('warning-banner')
    press(']')
    await screen.findByTestId('diagnosis')
    press('[')
    press(']')
    press('p')
    expect(screen.getByRole('button', { name: 'Previous step' })).toBeDisabled()
    await waitFor(() => expect(useSession.getState().replay?.stepIndex).toBe(1))
    expect(useSession.getState().replay?.autoplay).toBe(false)
    expect(screen.getByRole('button', { name: 'Previous step' })).toBeEnabled()
  })

  it('switches mode and instrument through the URL, and labels the thermometer SIMULATED', async () => {
    const router = renderSim()
    await ready()
    fireEvent.click(screen.getByRole('radio', { name: 'Thermometer (simulated)' }))
    await waitFor(() => expect(router.state.location.search).toContain('domain=thermometer'))
    expect(screen.getAllByTestId('badge').map((b) => b.textContent)).toContain('SIMULATED')
    // thermometer_demo is recorded, so the thermometer replay starts on its own instruction.
    expect(
      await screen.findByLabelText('Thermometer reading in degrees Celsius'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('session-error')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Live meter' }))
    await waitFor(() => expect(router.state.location.search).toContain('mode=live'))
  })

  it('does not start a live session while arrowing past Live meter', async () => {
    const router = renderSim()
    await ready()
    const seen: string[] = []
    const unsubscribe = router.subscribe((state) => seen.push(state.location.search))
    const startSpy = vi.spyOn(useSession.getState(), 'start')
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Replay' }), { key: 'ArrowLeft' })
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Live meter' }), { key: 'ArrowLeft' })
    expect(seen).toEqual([])
    fireEvent.click(screen.getByRole('radio', { name: 'Simulate' }))
    await waitFor(() => expect(router.state.location.search).toContain('mode=simulate'))
    expect(seen.some((q) => q.includes('mode=live'))).toBe(false)
    expect(startSpy.mock.calls.some(([opts]) => opts.mode === 'live')).toBe(false)
    unsubscribe()
    startSpy.mockRestore()
  })

  it('applies ?view=text to this visit only and never writes the Text only pref', async () => {
    const first = renderSim('/sim?demo=worked-example&view=text')
    await ready()
    expect(document.getElementById('scene-slot')).toBeNull()
    expect(usePrefs.getState().textOnly).toBe(false)
    first.dispose()
    cleanup()
    renderSim('/sim?demo=worked-example')
    await ready()
    expect(document.getElementById('scene-slot')).not.toBeNull()
    expect(usePrefs.getState().textOnly).toBe(false)
  })

  it('lets ?view=scene show the bench even when the Text only pref is on', async () => {
    usePrefs.setState({ textOnly: true })
    renderSim('/sim?demo=worked-example&view=scene')
    await ready()
    expect(document.getElementById('scene-slot')).not.toBeNull()
    expect(usePrefs.getState().textOnly).toBe(true)
  })

  it('ignores [ while a step is in flight', async () => {
    renderSim()
    await ready()
    press(']')
    await screen.findByTestId('warning-banner')
    useSession.setState({ phase: 'submitting' })
    const rewindSpy = vi.spyOn(useSession.getState(), 'replayPrevious')
    press('[')
    expect(rewindSpy).not.toHaveBeenCalled()
    useSession.setState({ phase: 'awaiting_reading' })
    press('[')
    await waitFor(() => expect(rewindSpy).toHaveBeenCalledOnce())
    rewindSpy.mockRestore()
  })

  it('omits the scene slot in the text-only view', async () => {
    usePrefs.setState({ textOnly: true })
    renderSim()
    await ready()
    expect(document.getElementById('scene-slot')).toBeNull()
  })
})
