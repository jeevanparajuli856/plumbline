import { act, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AboutPage } from '@/about/AboutPage'
import { STATUS_LINE, STUDIES, VALIDATION_STATS } from '@/landing/content'
import { EvidencePage } from './EvidencePage'

vi.mock('@/lib/webgl', () => ({ webglSupported: () => false }))
// GSAP motion has its own tests (landing/motion); pages render without it here.
vi.mock('@/landing/motion', () => ({ default: () => null }))

async function renderPage(page: React.ReactElement) {
  const view = render(<MemoryRouter>{page}</MemoryRouter>)
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
  return view
}

describe('EvidencePage', () => {
  it('states the status line as its h1 and has research, results and scope', async () => {
    const { container } = await renderPage(<EvidencePage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(STATUS_LINE)
    const ids = Array.from(container.querySelectorAll('main > section')).map((s) => s.id)
    expect(ids).toEqual(['research', 'results', 'scope'])
  })

  it('quotes each study as plain text for the line-by-line reveal', async () => {
    const { container } = await renderPage(<EvidencePage />)
    const quotes = container.querySelectorAll('[data-motion="quote"]')
    expect(quotes).toHaveLength(STUDIES.length)
    quotes.forEach((q, i) => {
      expect(q.childElementCount).toBe(0)
      expect(q).toHaveTextContent(STUDIES[i]!.quote)
    })
  })

  it('renders the full stat grid with counting hooks on simulated numbers only, and no readiness table or roadmap', async () => {
    const { container } = await renderPage(<EvidencePage />)
    const grid = screen.getByRole('list', { name: 'Validation results' })
    expect(within(grid).getAllByRole('listitem')).toHaveLength(VALIDATION_STATS.length)
    expect(container.querySelectorAll('[data-motion="stat"]')).toHaveLength(
      VALIDATION_STATS.filter((st) => st.isSimulated && st.value !== null).length,
    )
    expect(screen.queryByRole('table')).toBeNull()
    expect(container.textContent).not.toMatch(/Roadmap|User validation, now|Pilot, next/)
    expect(container.textContent).toContain('Preliminary. Not peer reviewed.')
  })
})

describe('AboutPage', () => {
  it('names the team and the university, with unique source link text', async () => {
    await renderPage(<AboutPage />)
    const team = screen.getByRole('region', { name: 'Team' })
    expect(team).toHaveTextContent('Jeevan Parajuli')
    expect(team).toHaveTextContent('University of Louisiana Monroe')
    const names = screen.getAllByRole('link').map((a) => a.textContent)
    expect(new Set(names).size).toBe(names.length)
    expect(names).toContain('arXiv 2602.18623')
  })

  it('has the pilot and partner anchors, each with its own contact link', async () => {
    await renderPage(<AboutPage />)
    expect(document.getElementById('pilot')).toHaveAccessibleName('Join the pilot')
    expect(document.getElementById('partner')).toHaveAccessibleName('Partner with us')
    expect(screen.getByRole('link', { name: 'Email us about the pilot' })).toHaveAttribute(
      'href',
      'mailto:support@truehand.tech?subject=Truehand%20pilot',
    )
    expect(
      screen.getByRole('link', { name: 'Email us about a partnership' }).getAttribute('href'),
    ).toMatch(/^mailto:support@truehand\.tech\?subject=/)
    expect(document.getElementById('pilot')).toHaveTextContent('Monroe, Louisiana')
  })
})
