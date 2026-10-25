import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '@/App'
import { usePrefs } from '@/state/prefs'
import { SmallScreenDisclosure } from './SmallScreenDisclosure'
import { useSystemTheme } from './useSystemTheme'

type Listener = () => void

function fakeMatchMedia(matches: Record<string, boolean>) {
  const listeners = new Map<string, Listener[]>()
  const mm = vi.fn((query: string) => ({
    get matches() {
      return matches[query] ?? false
    },
    media: query,
    addEventListener: (_: string, fn: Listener) =>
      listeners.set(query, [...(listeners.get(query) ?? []), fn]),
    removeEventListener: (_: string, fn: Listener) =>
      listeners.set(
        query,
        (listeners.get(query) ?? []).filter((f) => f !== fn),
      ),
  }))
  return { mm, fire: (q: string) => listeners.get(q)?.forEach((fn) => fn()) }
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.documentElement.className = ''
})

describe('useSystemTheme', () => {
  it('mirrors the OS onto html classes while the theme is System and clears them otherwise', () => {
    const state = {
      '(prefers-color-scheme: dark)': true,
      '(prefers-contrast: more), (forced-colors: active)': false,
    }
    const { mm, fire } = fakeMatchMedia(state)
    vi.stubGlobal('matchMedia', mm)
    const { rerender, unmount } = renderHook(({ t }) => useSystemTheme(t), {
      initialProps: { t: 'system' as 'system' | 'light' },
    })
    expect(document.documentElement.classList.contains('prefers-dark')).toBe(true)
    state['(prefers-contrast: more), (forced-colors: active)'] = true
    act(() => fire('(prefers-contrast: more), (forced-colors: active)'))
    expect(document.documentElement.classList.contains('prefers-hc')).toBe(true)
    expect(document.documentElement.classList.contains('prefers-dark')).toBe(false)
    rerender({ t: 'light' })
    expect(document.documentElement.className).toBe('')
    unmount()
  })
})

describe('SmallScreenDisclosure', () => {
  it('toggles its region and reports expanded state', () => {
    render(
      <SmallScreenDisclosure label="Display settings" className="gap-2">
        <span>inside</span>
      </SmallScreenDisclosure>,
    )
    const button = screen.getByRole('button', { name: 'Display settings' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById(button.getAttribute('aria-controls')!)?.className).toContain(
      'flex',
    )
  })
})

describe('NotFound', () => {
  it('is a skip-link target with a focusable h1', async () => {
    const { NotFound } = await import('./NotFound')
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    )
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('tabindex', '-1')
  })
})

describe('App shell', () => {
  function renderApp(url: string) {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          Component: App,
          children: [
            {
              index: true,
              Component: () => (
                <main id="main">
                  <h1>Home</h1>
                </main>
              ),
            },
          ],
        },
      ],
      { initialEntries: [url] },
    )
    render(<RouterProvider router={router} />)
  }

  it('puts the skip link first, then the display controls, and applies the theme', () => {
    usePrefs.setState({ theme: 'dark' })
    renderApp('/')
    const focusables = document.querySelectorAll('a[href], button')
    expect(focusables[0]).toHaveTextContent('Skip to main content')
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    usePrefs.setState({ theme: 'system' })
  })

  it('hides header and footer in presentation mode', () => {
    renderApp('/?present=1')
    expect(document.documentElement.dataset.present).toBe('true')
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
  })
})
