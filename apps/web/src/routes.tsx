import { createBrowserRouter, redirect } from 'react-router'
import { App } from './App'
import { HomePage } from './pages/HomePage'
import { SimPage } from './sim/SimPage'
import { NotFound } from './ui/NotFound'
import { PreviewGate } from './ui/PreviewGate'

/** Marketing pages other than Home load on demand, so the first paint carries Home only. */
export const router = createBrowserRouter([
  {
    path: '/',
    Component: App,
    children: [
      {
        index: true,
        loader: ({ request }) => {
          const url = new URL(request.url)
          if (url.searchParams.get('demo')) return redirect(`/sim${url.search}`)
          return null
        },
        Component: HomePage,
      },
      {
        path: 'sim',
        Component: () => (
          <PreviewGate>
            <SimPage />
          </PreviewGate>
        ),
      },
      {
        path: 'how-it-works',
        lazy: async () => ({ Component: (await import('./pages/HowItWorksPage')).HowItWorksPage }),
      },
      {
        path: 'evidence',
        lazy: async () => ({ Component: (await import('./evidence/EvidencePage')).EvidencePage }),
      },
      { path: 'app', lazy: async () => ({ Component: (await import('./pages/AppPage')).AppPage }) },
      {
        path: 'accessibility',
        lazy: async () => ({
          Component: (await import('./pages/AccessibilityPage')).AccessibilityPage,
        }),
      },
      {
        path: 'contact',
        lazy: async () => ({
          Component: (await import('./pages/contact/ContactPage')).ContactPage,
        }),
      },
      {
        path: 'about',
        lazy: async () => ({ Component: (await import('./about/AboutPage')).AboutPage }),
      },
      { path: '*', Component: NotFound },
    ],
  },
])
