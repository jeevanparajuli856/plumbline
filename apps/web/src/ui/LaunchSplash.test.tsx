import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

async function freshSplash() {
  vi.resetModules()
  return (await import('./LaunchSplash')).LaunchSplash
}

function setSearch(search: string) {
  window.history.replaceState(null, '', `/${search}`)
}

beforeEach(() => {
  vi.useFakeTimers()
  sessionStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  setSearch('')
})

describe('LaunchSplash', () => {
  it('never shows in a browser tab', async () => {
    const LaunchSplash = await freshSplash()
    const { container } = render(<LaunchSplash />)
    expect(container.querySelector('.launch-splash')).toBeNull()
  })

  it('previews with ?splash, stays out of the accessibility tree, then leaves', async () => {
    setSearch('?splash=1')
    const LaunchSplash = await freshSplash()
    const { container } = render(<LaunchSplash />)
    const splash = container.querySelector('.launch-splash')!
    expect(splash).toHaveAttribute('aria-hidden', 'true')
    expect(splash).toHaveAttribute('inert')
    act(() => vi.advanceTimersByTime(1500))
    expect(splash).toHaveAttribute('data-leaving', 'true')
    act(() => vi.advanceTimersByTime(500))
    expect(container.querySelector('.launch-splash')).toBeNull()
  })

  it('shows once per launch from the home screen', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    const First = await freshSplash()
    const a = render(<First />)
    expect(a.container.querySelector('.launch-splash')).not.toBeNull()
    a.unmount()
    const Second = await freshSplash()
    const b = render(<Second />)
    expect(b.container.querySelector('.launch-splash')).toBeNull()
  })
})
