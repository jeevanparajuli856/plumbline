import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '@/App'
import { usePrefs } from '@/state/prefs'
import { SmallScreenDisclosure } from './SmallScreenDisclosure'
import { useMediaQuery } from './useMediaQuery'
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

describe('useMediaQuery', () => {
  it('re-renders when the query starts or stops matching', () => {
    const state = { '(min-width: 80rem)': false }
    const { mm, fire } = fakeMatchMedia(state)
    vi.stubGlobal('matchMedia', mm)
    const { result } = renderHook(() => useMediaQuery('(min-width: 80rem)', true))
    expect(result.current).toBe(false)
    state['(min-width: 80rem)'] = true
    act(() => fire('(min-width: 80rem)'))
    expect(result.current).toBe(true)
  })

  it('returns the fallback without matchMedia', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 80rem)', true))
    expect(result.current).toBe(true)
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
  function renderApp(url: string, { strict = false } = {}) {
    const page = (name: string) => () => (
      <main id="main">
        <h1>{name}</h1>
      </main>
    )
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
                  <section id="research" aria-labelledby="research-title">
                    <h2 id="research-title">Research</h2>
                  </section>
                </main>
              ),
            },
            { path: 'evidence', Component: page('Evidence') },
          ],
        },
      ],
      { initialEntries: [url] },
    )
    const app = <RouterProvider router={router} />
    render(strict ? <StrictMode>{app}</StrictMode> : app)
    return router
  }

  const themeButton = () => screen.getByRole('button', { name: /^Theme: / })

  afterEach(() => {
    usePrefs.setState({ theme: 'system', textOnly: false })
  })

  it('puts the skip link first, then the theme button after the wordmark and nav, and applies the theme', () => {
    usePrefs.setState({ theme: 'dark' })
    renderApp('/')
    const focusables = [...document.querySelectorAll<HTMLElement>('a[href], button')].filter(
      (el) => !el.closest('[hidden]'),
    )
    expect(focusables[0]).toHaveTextContent('Skip to main content')
    const banner = screen.getByRole('banner')
    const inBanner = focusables.filter((el) => banner.contains(el))
    expect(inBanner.map((el) => el.textContent?.trim())).toEqual([
      'Truehand research preview',
      'Research',
      'Technology',
      'Validation',
      'Product',
      expect.stringMatching(/Theme: Dark/),
      'Open the simulator',
    ])
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('below xl puts the nav after the theme button and simulator link, matching the visual rows', () => {
    const { mm } = fakeMatchMedia({ '(min-width: 80rem)': false })
    vi.stubGlobal('matchMedia', mm)
    renderApp('/')
    const banner = screen.getByRole('banner')
    const order = [...banner.querySelectorAll<HTMLElement>('a[href], button')]
      .filter((el) => !el.closest('[hidden]'))
      .map((el) => el.textContent?.trim())
    expect(order).toEqual([
      'Truehand research preview',
      expect.stringMatching(/Theme: /),
      'Open the simulator',
      'Research',
      'Technology',
      'Validation',
      'Product',
    ])
    expect(screen.getAllByRole('navigation', { name: 'Primary' })).toHaveLength(1)
  })

  it('draws the popover boundary with the strong control border, not the hairline', () => {
    renderApp('/')
    fireEvent.click(themeButton())
    const dialog = screen.getByRole('dialog', { name: 'Display' })
    expect(dialog.className).toContain('border-border-strong')
    expect(dialog.className).toContain('border-[1.5px]')
    expect(dialog.className).not.toContain('border-hairline')
    // Focusable itself, so a click on its text keeps focus (and the Tab trap) inside.
    expect(dialog).toHaveAttribute('tabindex', '-1')
  })

  it('has one banner with the wordmark, the four primary links and the simulator link, no university', () => {
    renderApp('/evidence')
    const banner = screen.getByRole('banner')
    expect(within(banner).getByRole('link', { name: /^Truehand/ })).toHaveAttribute('href', '/')
    const nav = within(banner).getByRole('navigation', { name: 'Primary' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['Research', '/#research'],
      ['Technology', '/#play'],
      ['Validation', '/evidence'],
      ['Product', '/#product'],
    ])
    expect(within(nav).getByRole('link', { name: 'Validation' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav).getByRole('link', { name: 'Research' })).not.toHaveAttribute('aria-current')
    expect(within(banner).getByRole('link', { name: 'Open the simulator' })).toHaveAttribute(
      'href',
      '/sim',
    )
    expect(banner).not.toHaveTextContent('Louisiana')
  })

  it.each([
    ['system', 'System'],
    ['light', 'Light'],
    ['dark', 'Dark'],
    ['hc', 'High contrast'],
  ] as const)('names the theme button for the %s theme', (theme, label) => {
    usePrefs.setState({ theme })
    renderApp('/')
    const button = themeButton()
    expect(button).toHaveAccessibleName(
      expect.stringMatching(new RegExp(`^Theme: ${label}\\. Open display settings`)),
    )
    expect(button).toHaveAccessibleName(expect.stringContaining('Display settings'))
    expect(button).toHaveAttribute('aria-haspopup', 'dialog')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById(button.getAttribute('aria-controls')!)).not.toBeNull()
  })

  it('opens the Display popover with the theme radios and both switches, focused on the checked radio', () => {
    usePrefs.setState({ theme: 'light' })
    renderApp('/')
    expect(screen.queryByRole('dialog', { name: 'Display' })).not.toBeInTheDocument()
    fireEvent.click(themeButton())
    const dialog = screen.getByRole('dialog', { name: 'Display' })
    expect(themeButton()).toHaveAttribute('aria-expanded', 'true')
    expect(themeButton().getAttribute('aria-controls')).toBe(dialog.id)
    expect(dialog).not.toHaveAttribute('aria-modal')
    expect(within(dialog).getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument()
    expect(
      within(dialog)
        .getAllByRole('radio')
        .map((r) => r.textContent),
    ).toEqual(['System', 'Light', 'Dark', 'High contrast'])
    expect(within(dialog).getByRole('switch', { name: 'Text only' })).toHaveAccessibleDescription(
      'Hides the 3D view. Everything is in the text.',
    )
    expect(within(dialog).getByRole('switch', { name: 'Reduce motion' })).toBeInTheDocument()
    expect(document.activeElement).toBe(within(dialog).getByRole('radio', { name: 'Light' }))
  })

  it('closes on Escape and returns focus to the theme button', () => {
    renderApp('/')
    fireEvent.click(themeButton())
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Display' })).not.toBeInTheDocument()
    expect(themeButton()).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).toBe(themeButton())
  })

  it('closes from the theme button itself and returns focus to it', () => {
    renderApp('/')
    fireEvent.click(themeButton())
    fireEvent.click(themeButton())
    expect(screen.queryByRole('dialog', { name: 'Display' })).not.toBeInTheDocument()
    expect(document.activeElement).toBe(themeButton())
  })

  it('closes on a click outside without moving focus there', () => {
    renderApp('/')
    fireEvent.click(themeButton())
    const heading = screen.getByRole('heading', { name: 'Home', level: 1 })
    fireEvent.pointerDown(heading)
    expect(screen.queryByRole('dialog', { name: 'Display' })).not.toBeInTheDocument()
    expect(document.activeElement).not.toBe(themeButton())
  })

  it('keeps Tab and Shift+Tab inside the popover', () => {
    usePrefs.setState({ theme: 'system' })
    renderApp('/')
    fireEvent.click(themeButton())
    const dialog = screen.getByRole('dialog', { name: 'Display' })
    const system = within(dialog).getByRole('radio', { name: 'System' })
    const reduce = within(dialog).getByRole('switch', { name: 'Reduce motion' })
    expect(document.activeElement).toBe(system)
    fireEvent.keyDown(system, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(reduce)
    fireEvent.keyDown(reduce, { key: 'Tab' })
    expect(document.activeElement).toBe(system)
  })

  it('keeps arrow keys on the Theme radios and sets html data-theme', () => {
    usePrefs.setState({ theme: 'light' })
    renderApp('/')
    fireEvent.click(themeButton())
    const dialog = screen.getByRole('dialog', { name: 'Display' })
    fireEvent.keyDown(within(dialog).getByRole('radio', { name: 'Light' }), { key: 'ArrowRight' })
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.activeElement).toBe(within(dialog).getByRole('radio', { name: 'Dark' }))
    fireEvent.click(within(dialog).getByRole('radio', { name: 'High contrast' }))
    expect(document.documentElement.dataset.theme).toBe('hc')
    expect(themeButton()).toHaveAccessibleName(expect.stringMatching(/^Theme: High contrast\./))
  })

  it('closes the popover on a route change', async () => {
    const router = renderApp('/')
    fireEvent.click(themeButton())
    expect(screen.getByRole('dialog', { name: 'Display' })).toBeInTheDocument()
    await act(() => router.navigate('/evidence'))
    expect(screen.queryByRole('dialog', { name: 'Display' })).not.toBeInTheDocument()
  })

  it('scrolls a primary hash link to its section and focuses the section heading', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    renderApp('/')
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    fireEvent.click(within(nav).getByRole('link', { name: 'Research' }))
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Research' })),
    )
    expect(scrollIntoView).toHaveBeenCalled()
  })

  describe('hash links', () => {
    const frames = () => new Promise((resolve) => setTimeout(resolve, 60))
    const researchTitle = () => screen.getByRole('heading', { name: 'Research' })
    const primaryLink = (name: string) =>
      within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name })

    afterEach(() => {
      // @ts-expect-error jsdom has no scrollIntoView; tests install a spy and remove it here.
      delete Element.prototype.scrollIntoView
    })

    it('scrolls on first load with a hash but leaves focus alone, also under StrictMode', async () => {
      const scrollIntoView = vi.fn()
      Element.prototype.scrollIntoView = scrollIntoView
      renderApp('/#research', { strict: true })
      await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
      await frames()
      expect(document.activeElement).not.toBe(researchTitle())
    })

    it('focuses the section heading again when the same hash link is clicked twice', async () => {
      Element.prototype.scrollIntoView = vi.fn()
      renderApp('/')
      fireEvent.click(primaryLink('Research'))
      await waitFor(() => expect(document.activeElement).toBe(researchTitle()))
      researchTitle().blur()
      fireEvent.click(primaryLink('Research'))
      await waitFor(() => expect(document.activeElement).toBe(researchTitle()))
    })

    it('is a no-op for a missing target or a malformed hash', async () => {
      const scrollIntoView = vi.fn()
      Element.prototype.scrollIntoView = scrollIntoView
      const router = renderApp('/#%E0%A4%A')
      fireEvent.click(primaryLink('Product'))
      await frames()
      await act(() => router.navigate('/#%zz'))
      await frames()
      expect(scrollIntoView).not.toHaveBeenCalled()
      expect(screen.getByRole('heading', { name: 'Home', level: 1 })).toBeInTheDocument()
    })

    it('focuses research-title when Research is followed from another route', async () => {
      Element.prototype.scrollIntoView = vi.fn()
      renderApp('/evidence')
      fireEvent.click(primaryLink('Research'))
      await waitFor(() => expect(document.activeElement).toBe(researchTitle()))
    })
  })

  it('hides header and footer in presentation mode', () => {
    renderApp('/?present=1')
    expect(document.documentElement.dataset.present).toBe('true')
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
  })
})
