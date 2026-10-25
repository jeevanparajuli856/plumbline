import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyQueue, readQueue, replaceQueue } from '@/a11y/liveQueue'
import { registerShortcut } from '@/a11y/shortcutRegistry'
import { usePrefs } from '@/state/prefs'
import { useSession } from '@/state/session'
import { SimPage } from './SimPage'

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
    expect(screen.getAllByTestId('badge').map((b) => b.textContent)).toContain('PROVISIONAL')
    expect(document.getElementById('scene-slot')).toBeEmptyDOMElement()
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
    expect(diagnosis).toHaveTextContent('R2 is shorted')
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
    fireEvent.click(within(within(strip).getAllByRole('listitem')[4]!).getByRole('button'))
    expect(useSession.getState().aimedSite).toBe(4)

    press('?')
    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toHaveAttribute('open')
    press('Escape')
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

  it('switches mode and instrument through the URL, and labels the thermometer SIMULATED', async () => {
    const router = renderSim()
    await ready()
    fireEvent.click(screen.getByRole('radio', { name: 'Thermometer (simulated)' }))
    await waitFor(() => expect(router.state.location.search).toContain('domain=thermometer'))
    expect(screen.getAllByTestId('badge').map((b) => b.textContent)).toContain('SIMULATED')
    expect(await screen.findByTestId('session-error')).toHaveTextContent('not available')
    fireEvent.click(screen.getByRole('radio', { name: 'Live meter' }))
    await waitFor(() => expect(router.state.location.search).toContain('mode=live'))
  })

  it('omits the scene slot in the text-only view', async () => {
    usePrefs.setState({ textOnly: true })
    renderSim()
    await ready()
    expect(document.getElementById('scene-slot')).toBeNull()
  })
})
