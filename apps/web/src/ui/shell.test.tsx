import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '@/App'
import { useMotionPref } from '@/a11y/motionPref'
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
    const state = { '(min-width: 64rem)': false }
    const { mm, fire } = fakeMatchMedia(state)
    vi.stubGlobal('matchMedia', mm)
    const { result } = renderHook(() => useMediaQuery('(min-width: 64rem)', true))
    expect(result.current).toBe(false)
    state['(min-width: 64rem)'] = true
    act(() => fire('(min-width: 64rem)'))
    expect(result.current).toBe(true)
  })

  it('returns the fallback without matchMedia', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 64rem)', true))
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
            { path: 'how-it-works', Component: page('How it works') },
          ],
        },
      ],
      { initialEntries: [url] },
    )
    const app = <RouterProvider router={router} />
    render(strict ? <StrictMode>{app}</StrictMode> : app)
    return router
  }

  const toggle = () => screen.getByRole('button', { name: /^Switch to (dark|light) theme$/ })
  const visibleFocusables = (root: ParentNode) =>
    [...root.querySelectorAll<HTMLElement>('a[href], button')].map((el) => el.textContent?.trim())

  const originalAnimate = Object.getOwnPropertyDescriptor(document.documentElement, 'animate')

  afterEach(() => {
    usePrefs.setState({ theme: 'system', textOnly: false })
    useMotionPref.getState().setReduceMotion(false)
    // @ts-expect-error jsdom has no View Transitions; tests install a stub and remove it here.
    delete document.startViewTransition
    if (originalAnimate) Object.defineProperty(document.documentElement, 'animate', originalAnimate)
    // @ts-expect-error jsdom has no Web Animations; tests install a spy and remove it here.
    else delete document.documentElement.animate
    delete document.documentElement.dataset.themeReveal
    vi.unstubAllGlobals()
  })

  /** A View Transitions stand-in. Callbacks run when the test says so, like the real async start. */
  function stubTransitions({ ready }: { ready?: Promise<void> } = {}) {
    const pending: Array<() => void> = []
    const finish: Array<() => void> = []
    const startViewTransition = vi.fn((update: () => void) => {
      let done!: () => void
      const finished = new Promise<void>((resolve) => (done = resolve))
      finish.push(done)
      const callbackDone = new Promise<void>((resolve, reject) =>
        pending.push(() => {
          try {
            update()
            resolve()
          } catch (error) {
            reject(error)
          }
        }),
      )
      return {
        updateCallbackDone: callbackDone,
        ready: ready ?? callbackDone,
        finished: callbackDone.then(() => finished),
      }
    })
    Object.assign(document, { startViewTransition })
    return {
      startViewTransition,
      runCallbacks: () => act(() => pending.splice(0).forEach((run) => run())),
      finishAll: () => finish.splice(0).forEach((done) => done()),
      finishNext: () => finish.shift()?.(),
    }
  }

  it('puts the skip link first, then wordmark, nav, toggle and Demo, and applies the theme', () => {
    usePrefs.setState({ theme: 'dark' })
    renderApp('/')
    const focusables = document.querySelectorAll('a[href], button')
    expect(focusables[0]).toHaveTextContent('Skip to main content')
    expect(visibleFocusables(screen.getByRole('banner'))).toEqual([
      'Truehand',
      'How it works',
      'Evidence',
      'The app',
      'Accessibility',
      'Docs',
      'Switch to light theme',
      'Demo',
    ])
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('below lg keeps the wordmark and toggle on top and moves the nav to the phone tab bar', () => {
    const { mm } = fakeMatchMedia({ '(min-width: 64rem)': false })
    vi.stubGlobal('matchMedia', mm)
    renderApp('/')
    expect(visibleFocusables(screen.getByRole('banner'))).toEqual([
      'Truehand',
      'Switch to dark theme',
    ])
    const navs = screen.getAllByRole('navigation', { name: 'Primary' })
    expect(navs).toHaveLength(1)
    const tabs = navs[0]!
    expect(screen.getByRole('banner')).not.toContainElement(tabs)
    expect(
      within(tabs)
        .getAllByRole('link')
        .map((l) => [l.getAttribute('aria-label') ?? l.textContent, l.getAttribute('href')]),
    ).toEqual([
      ['Home', '/'],
      ['How it works', '/how-it-works'],
      ['Demo', '/sim'],
      ['Evidence', '/evidence'],
    ])
    expect(within(tabs).getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
    expect(within(tabs).getByRole('button', { name: 'More' })).toHaveAttribute(
      'aria-haspopup',
      'dialog',
    )
  })

  it('at lg and up renders no tab bar', () => {
    renderApp('/')
    expect(document.querySelector('.tabbar')).toBeNull()
  })

  it('has the wordmark, five page links with aria-current by route, and Demo; no tag or names', () => {
    renderApp('/evidence')
    const banner = screen.getByRole('banner')
    expect(within(banner).getByRole('link', { name: 'Truehand' })).toHaveAttribute('href', '/')
    const nav = within(banner).getByRole('navigation', { name: 'Primary' })
    expect(
      within(nav)
        .getAllByRole('link')
        .map((l) => [l.textContent, l.getAttribute('href')]),
    ).toEqual([
      ['How it works', '/how-it-works'],
      ['Evidence', '/evidence'],
      ['The app', '/app'],
      ['Accessibility', '/accessibility'],
      ['Docs', '/docs'],
    ])
    expect(within(nav).getByRole('link', { name: 'Evidence' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav).getByRole('link', { name: 'How it works' })).not.toHaveAttribute(
      'aria-current',
    )
    expect(within(banner).getByRole('link', { name: 'Demo' })).toHaveAttribute('href', '/sim')
    expect(banner).not.toHaveTextContent(/research preview|Louisiana|Parajuli|simulator/i)
  })

  it.each([
    ['light', 'Switch to dark theme'],
    ['dark', 'Switch to light theme'],
    ['hc', 'Switch to light theme'],
    ['system', 'Switch to dark theme'],
  ] as const)('names the toggle for the %s theme', (theme, name) => {
    usePrefs.setState({ theme })
    renderApp('/')
    expect(toggle()).toHaveAccessibleName(name)
    expect(toggle()).not.toHaveAttribute('aria-haspopup')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('flips the resolved theme in one press, and leaves high contrast for light', () => {
    usePrefs.setState({ theme: 'light' })
    renderApp('/')
    fireEvent.click(toggle())
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(usePrefs.getState().theme).toBe('dark')
    expect(toggle()).toHaveAccessibleName('Switch to light theme')
    fireEvent.click(toggle())
    expect(document.documentElement.dataset.theme).toBe('light')
    act(() => usePrefs.setState({ theme: 'hc' }))
    fireEvent.click(toggle())
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('reveals the new theme from the button through a view transition', async () => {
    const animate = vi.fn()
    document.documentElement.animate = animate
    const { startViewTransition, runCallbacks, finishAll } = stubTransitions()
    usePrefs.setState({ theme: 'light' })
    renderApp('/')
    fireEvent.click(toggle())
    expect(startViewTransition).toHaveBeenCalledOnce()
    // The cross-fade override applies to this reveal only.
    expect(document.documentElement.dataset.themeReveal).toBe('true')
    runCallbacks()
    expect(document.documentElement.dataset.theme).toBe('dark')
    await waitFor(() => expect(animate).toHaveBeenCalledOnce())
    const [keyframes, options] = animate.mock.calls[0]!
    expect(keyframes.clipPath[0]).toMatch(/^circle\(0px at /)
    expect(options).toMatchObject({ pseudoElement: '::view-transition-new(root)' })
    finishAll()
    await waitFor(() => expect(document.documentElement.dataset.themeReveal).toBeUndefined())
  })

  it('flips twice when pressed twice before the first transition starts', async () => {
    document.documentElement.animate = vi.fn()
    const { startViewTransition, runCallbacks, finishNext } = stubTransitions()
    usePrefs.setState({ theme: 'light' })
    renderApp('/')
    fireEvent.click(toggle())
    fireEvent.click(toggle())
    expect(startViewTransition).toHaveBeenCalledTimes(2)
    runCallbacks()
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(usePrefs.getState().theme).toBe('light')
    // The older transition settling first leaves the newer one's cross-fade override in place.
    finishNext()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(document.documentElement.dataset.themeReveal).toBe('true')
    finishNext()
    await waitFor(() => expect(document.documentElement.dataset.themeReveal).toBeUndefined())
  })

  it('ignores a skipped transition but reports any other failure', async () => {
    const reportError = vi.fn()
    vi.stubGlobal('reportError', reportError)
    const skipped = Promise.reject(new DOMException('Skipped', 'AbortError'))
    const { runCallbacks } = stubTransitions({ ready: skipped })
    usePrefs.setState({ theme: 'light' })
    renderApp('/')
    fireEvent.click(toggle())
    runCallbacks()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(reportError).not.toHaveBeenCalled()
    expect(document.documentElement.dataset.theme).toBe('dark')

    const broken = new Error('animate failed')
    document.documentElement.animate = () => {
      throw broken
    }
    const { runCallbacks: runAgain } = stubTransitions()
    fireEvent.click(toggle())
    runAgain()
    await waitFor(() => expect(reportError).toHaveBeenCalledWith(broken))
  })

  it('reports an update callback that throws instead of losing it', async () => {
    const reportError = vi.fn()
    vi.stubGlobal('reportError', reportError)
    document.documentElement.animate = vi.fn()
    const { runCallbacks } = stubTransitions()
    usePrefs.setState({ theme: 'light' })
    renderApp('/')
    const failure = new Error('storage is full')
    const setTheme = usePrefs.getState().setTheme
    usePrefs.setState({
      setTheme: () => {
        throw failure
      },
    })
    try {
      fireEvent.click(toggle())
      runCallbacks()
      await waitFor(() => expect(reportError).toHaveBeenCalledWith(failure))
      expect(reportError).toHaveBeenCalledOnce()
    } finally {
      usePrefs.setState({ setTheme })
    }
  })

  it('skips the reveal under reduced motion and switches at once', () => {
    const startViewTransition = vi.fn()
    Object.assign(document, { startViewTransition })
    useMotionPref.getState().setReduceMotion(true)
    usePrefs.setState({ theme: 'light' })
    renderApp('/')
    fireEvent.click(toggle())
    expect(startViewTransition).not.toHaveBeenCalled()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('switches at once without the View Transitions API', () => {
    usePrefs.setState({ theme: 'dark' })
    renderApp('/')
    fireEvent.click(toggle())
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('keeps the footer to the product line and its links, with no names', () => {
    renderApp('/')
    const footer = screen.getByRole('contentinfo')
    expect(footer).toHaveTextContent('Truehand.')
    expect(footer).toHaveTextContent('Not a safety device.')
    expect(within(footer).getByRole('link', { name: 'Contact' })).toHaveAttribute(
      'href',
      '/contact',
    )
    expect(within(footer).getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about')
    expect(within(footer).getByRole('link', { name: 'support@truehand.tech' })).toHaveAttribute(
      'href',
      'mailto:support@truehand.tech',
    )
    expect(footer).not.toHaveTextContent(/Parajuli|Bhatta|University|Louisiana/)
  })

  describe('hash links', () => {
    const frames = () => new Promise((resolve) => setTimeout(resolve, 60))
    const researchTitle = () => screen.getByRole('heading', { name: 'Research' })

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

    it('focuses the section heading again when the same hash is followed twice', async () => {
      Element.prototype.scrollIntoView = vi.fn()
      const router = renderApp('/')
      await act(() => router.navigate('/#research'))
      await waitFor(() => expect(document.activeElement).toBe(researchTitle()))
      researchTitle().blur()
      await act(() => router.navigate('/#research'))
      await waitFor(() => expect(document.activeElement).toBe(researchTitle()))
    })

    it('is a no-op for a missing target or a malformed hash', async () => {
      const scrollIntoView = vi.fn()
      Element.prototype.scrollIntoView = scrollIntoView
      const router = renderApp('/#%E0%A4%A')
      await act(() => router.navigate('/#product'))
      await frames()
      await act(() => router.navigate('/#%zz'))
      await frames()
      expect(scrollIntoView).not.toHaveBeenCalled()
      expect(screen.getByRole('heading', { name: 'Home', level: 1 })).toBeInTheDocument()
    })

    it('focuses research-title when /#research is followed from another route', async () => {
      Element.prototype.scrollIntoView = vi.fn()
      const router = renderApp('/evidence')
      await act(() => router.navigate('/#research'))
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
