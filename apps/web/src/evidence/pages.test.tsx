import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AboutPage } from '@/about/AboutPage'
import { EvidencePage } from './EvidencePage'

describe('EvidencePage', () => {
  it('renders every readiness row with text status badges and keeps PENDING rows', () => {
    render(<EvidencePage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Simulation validated. User validation in progress.',
    )
    const table = screen.getByRole('table', { name: 'Readiness' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.length).toBeGreaterThan(15)
    expect(within(table).getAllByText('PENDING').length).toBeGreaterThan(5)
    expect(within(table).getAllByTestId('badge')[0]).toBeVisible()
  })

  it('renders commands in mono and URLs as links', () => {
    const { container } = render(<EvidencePage />)
    expect(container.querySelector('code')?.className).toContain('font-mono')
    expect(
      screen.getAllByRole('link').some((a) => a.getAttribute('href')?.startsWith('https://')),
    ).toBe(true)
  })
})

describe('AboutPage', () => {
  it('names the team, lists sources with unique link text and reads the assumed numbers from the recording', async () => {
    render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('region', { name: 'Team' })).toHaveTextContent('Jeevan Parajuli')
    expect(screen.getByRole('region', { name: 'Team' })).toHaveTextContent(
      'University of Louisiana Monroe',
    )
    const names = screen.getAllByRole('link').map((a) => a.textContent)
    expect(new Set(names).size).toBe(names.length)
    expect(names).toContain('arXiv 2602.18623')
    await waitFor(() => expect(screen.getByText(/0\.78, 0\.08 and 0\.03/)).toBeInTheDocument())
  })
})
