import { createBrowserRouter, redirect } from 'react-router'
import { App } from './App'
import { AboutPage } from './about/AboutPage'
import { EvidencePage } from './evidence/EvidencePage'
import { LandingPage } from './landing/LandingPage'
import { SimPage } from './sim/SimPage'
import { NotFound } from './ui/NotFound'
import { PreviewGate } from './ui/PreviewGate'

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
        Component: LandingPage,
      },
      {
        path: 'sim',
        Component: () => (
          <PreviewGate>
            <SimPage />
          </PreviewGate>
        ),
      },
      { path: 'evidence', Component: EvidencePage },
      { path: 'about', Component: AboutPage },
      { path: '*', Component: NotFound },
    ],
  },
])
