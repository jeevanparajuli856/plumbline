import { act, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { AboutPage } from '@/about/AboutPage'
import { EvidencePage } from '@/evidence/EvidencePage'
import { PHOTOS } from '@/landing/photos'
import { FOUNDER_NAMES, METHOD_WORDS, TROPES } from '@/test/copyGuards'
import { AccessibilityPage } from './AccessibilityPage'
import { AppPage } from './AppPage'
import { ContactPage } from './contact/ContactPage'
import { HomePage } from './HomePage'
import { HowItWorksPage } from './HowItWorksPage'

vi.mock('@/lib/webgl', () => ({ webglSupported: () => false }))
// GSAP motion has its own tests (landing/motion); pages render without it here.
vi.mock('@/landing/motion', () => ({ default: () => null }))

const PAGES: ReadonlyArray<readonly [string, () => ReactElement]> = [
  ['/', () => <HomePage />],
  ['/how-it-works', () => <HowItWorksPage />],
  ['/evidence', () => <EvidencePage />],
  ['/app', () => <AppPage />],
  ['/accessibility', () => <AccessibilityPage />],
  ['/contact', () => <ContactPage />],
  ['/about', () => <AboutPage />],
]

async function renderedText(
  page: () => ReactElement,
): Promise<{ text: string; root: HTMLElement }> {
  const { container } = render(<MemoryRouter>{page()}</MemoryRouter>)
  // Two turns: fixtures load, then the components that read them render.
  for (let i = 0; i < 3; i += 1) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
  }
  return { text: container.textContent ?? '', root: container }
}

describe.each(PAGES)('the rendered copy of %s', (path, page) => {
  it('has exactly one h1 and a substantial amount of text', async () => {
    const { text, root } = await renderedText(page)
    expect(root.querySelectorAll('h1')).toHaveLength(1)
    expect(text.length).toBeGreaterThan(200)
  })

  it('never discloses the method (POSITIONING section 3)', async () => {
    const { text } = await renderedText(page)
    for (const [name, re] of METHOD_WORDS) {
      expect({ path, name, hit: re.exec(text)?.[0] ?? null }).toEqual({ path, name, hit: null })
    }
  })

  it('uses none of the banned copy tropes', async () => {
    const { text } = await renderedText(page)
    for (const [name, re] of TROPES) {
      expect({ path, name, hit: re.exec(text)?.[0] ?? null }).toEqual({ path, name, hit: null })
    }
  })

  it('names founders and the university only on /about', async () => {
    const { text } = await renderedText(page)
    expect(FOUNDER_NAMES.test(text)).toBe(path === '/about')
  })

  it('shows no roadmap and no Nexus mention', async () => {
    const { text } = await renderedText(page)
    expect(text).not.toMatch(/Roadmap|Nexus|Get Started|Read more|Learn more/i)
  })

  it('renders every photo with its alt, size, lazy loading and a credit', async () => {
    const { root } = await renderedText(page)
    for (const img of root.querySelectorAll('img')) {
      const photo = Object.values(PHOTOS).find((p) => p.src === img.getAttribute('src'))
      expect(photo).toBeDefined()
      expect(img).toHaveAttribute('alt', photo!.alt)
      expect(img).toHaveAttribute('width', String(photo!.width))
      expect(img).toHaveAttribute('loading', 'lazy')
      expect(img.closest('figure')!.querySelector('figcaption')).toHaveTextContent(photo!.credit)
    }
  })
})

describe('the method guard', () => {
  it('catches each kind of disclosure it is meant to catch', () => {
    const samples = [
      'b′(f) ∝ b(f)',
      'lands 0.78 of the time',
      'expected information gain',
      'entropy falls',
      'the posterior over rows',
      'the confusion model',
      'see engine.py',
      'uv run --project engine',
      'commit d4731fc',
      'Open the simulator',
      'Research preview',
    ]
    samples.forEach((sample, i) => expect(METHOD_WORDS[i]![1].test(sample)).toBe(true))
  })
})
