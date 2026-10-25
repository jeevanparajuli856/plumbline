import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Catalog } from '@/state/types'
import { BeliefChart } from './BeliefChart'
import { RefusalPanel } from './Outcome'
import { PlacementStrip } from './PlacementStrip'
import { placementItems } from './view'
import { WarningBanner } from './WarningBanner'

const catalog: Catalog = {
  domain: 'circuit',
  simulated: false,
  readingUnit: 'V',
  sigma: 0.02,
  hypotheses: [
    { id: 'LED_open', label: 'LED is open', spoken: 'LED open', description: '' },
    {
      id: 'LED_reversed',
      label: 'LED is installed backwards',
      spoken: 'LED reversed',
      description: '',
    },
    { id: 'nominal', label: 'No fault', spoken: 'no fault', description: '' },
  ],
  sites: [0, 1, 2].map((index) => ({
    index,
    label: `row ${index + 1}`,
    spoken: `row ${index + 1}`,
  })),
  classes: [['LED_open', 'LED_reversed'], ['nominal']],
}

describe('BeliefChart', () => {
  it('names the tied pair, with no single percentage, in the Truehand verdict when unresolved', () => {
    render(
      <BeliefChart
        belief={[0.5, 0.5, 0]}
        catalog={catalog}
        baseline={null}
        hasReadings
        unresolvedLabels={['LED is open', 'LED is installed backwards']}
      />,
    )
    const verdict = screen.getByTestId('belief-verdict')
    expect(verdict.textContent).toBe('Unresolved: LED is open or LED is installed backwards')
    expect(verdict.textContent).not.toMatch(/%/)
  })

  it('shows the top fault with its percentage otherwise', () => {
    render(<BeliefChart belief={[0.7, 0.2, 0.1]} catalog={catalog} baseline={null} hasReadings />)
    const figure = screen.getByRole('figure', { name: 'Belief over faults' })
    expect(within(figure).getAllByText('70.0%').length).toBeGreaterThan(0)
    expect(screen.queryByText(/^Unresolved:/)).not.toBeInTheDocument()
    expect(screen.getByTestId('belief-verdict')).toHaveTextContent('LED is open 70.0%')
    expect(screen.getAllByTestId('belief-verdict')).toHaveLength(1)
  })
})

describe('RefusalPanel', () => {
  it('is a region named Unresolved with the pair and its own "will not guess" line', () => {
    render(<RefusalPanel text="" pair={catalog.hypotheses.slice(0, 2)} />)
    const region = screen.getByRole('region', { name: 'Unresolved' })
    expect(region).toHaveAttribute('data-testid', 'unresolved')
    expect(region).toHaveAttribute('tabindex', '-1')
    const pair = within(region).getByRole('list', { name: 'Faults that look the same' })
    expect(
      within(pair)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['LED is open', 'LED is installed backwards'])
    expect(region).toHaveTextContent('will not guess')
  })
})

describe('WarningBanner', () => {
  it('is a focusable region named Placement warning, not a live region', () => {
    render(
      <WarningBanner
        warning={{
          toldSite: 2,
          likelySite: 1,
          pOffSite: 1,
          text: 'Warning. That reading did not come from row 3.',
        }}
        likelyLabel="row 2"
      />,
    )
    const banner = screen.getByRole('region', { name: 'Placement warning' })
    expect(banner).toHaveAttribute('data-testid', 'warning-banner')
    expect(banner).toHaveAttribute('tabindex', '-1')
    expect(banner).not.toHaveAttribute('aria-live')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(banner.textContent?.startsWith('Warning.')).toBe(true)
    expect(banner).toHaveTextContent('Row 2 100%')
  })
})

describe('PlacementStrip', () => {
  it('says No reading yet before any reading and marks the aimed row with aria-current', () => {
    const onAim = vi.fn()
    const items = placementItems({
      placement: [0, 0, 0],
      catalog,
      toldSite: 2,
      landedSite: null,
      aimedSite: 1,
    })
    render(<PlacementStrip items={items} siteNoun="row" onAim={onAim} />)
    expect(screen.getByText('No reading yet.')).toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Where the probe landed' })
    const rows = within(list).getAllByRole('listitem')
    expect(rows[1]).toHaveAttribute('aria-current', 'true')
    expect(rows[1]).toHaveTextContent('aimed')
    expect(rows[0]).not.toHaveAttribute('aria-current')
    const aimRow1 = within(rows[0]!).getByRole('button', { name: 'Aim at row 1' })
    expect(aimRow1).toHaveAttribute('aria-keyshortcuts', '1')
    expect(rows[0]).toHaveTextContent('Row 1, no reading yet')
    fireEvent.click(aimRow1)
    expect(onAim).toHaveBeenCalledWith(0)
  })

  it('shows percentages once a posterior exists', () => {
    const items = placementItems({
      placement: [0.1, 0.8, 0.1],
      catalog,
      toldSite: 2,
      landedSite: 1,
      aimedSite: null,
    })
    render(<PlacementStrip items={items} siteNoun="row" onAim={() => {}} />)
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.queryByText('No reading yet.')).not.toBeInTheDocument()
  })
})
