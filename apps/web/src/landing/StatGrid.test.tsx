import { render, screen, within } from '@testing-library/react'
import { buildValidationStats, VALIDATION_STATS } from './content'
import { StatGrid } from './sections/StatGrid'

describe('StatGrid', () => {
  it('renders the pending cell by its kind, with a PENDING badge and no motion hook', () => {
    render(<StatGrid stats={VALIDATION_STATS} />)
    const cells = within(screen.getByRole('list', { name: 'Validation results' })).getAllByRole(
      'listitem',
    )
    const pending = cells.at(-1)!
    expect(within(pending).getByTestId('badge')).toHaveTextContent('PENDING')
    expect(pending.querySelector('[data-motion]')).toBeNull()
    expect(document.querySelectorAll('[data-motion="stat"]')).toHaveLength(3)
  })

  it('says "Not recorded in <path>" and never animates when the run file is missing', () => {
    render(<StatGrid stats={buildValidationStats({})} />)
    expect(document.querySelector('[data-motion="stat"]')).toBeNull()
    expect(screen.getAllByText('Not recorded in docs/results/stability_<date>.md')).toHaveLength(2)
    expect(screen.getByText('Not recorded in docs/results/mismatch_<date>.md')).toBeInTheDocument()
    expect(screen.getAllByTestId('badge').map((b) => b.textContent)).toEqual(['PENDING'])
  })

  it('keeps cells whose row exists and blanks only the one whose column is missing', () => {
    const md = [
      '# Stability',
      '- Generated: 2026-10-25T00:00',
      '- Seeds: [1]; n per arm per seed: 10',
      '| Method | Faults | Correct % (mean ± sd) | Resolved correct % |',
      '|---|---|---|---|',
      '| truehand | 10 | 90.0 ± 1.0 | 80.0 |',
    ].join('\n')
    render(<StatGrid stats={buildValidationStats({ '/x/results/stability_2026-10-25.md': md })} />)
    const hooks = Array.from(document.querySelectorAll<HTMLElement>('[data-motion="stat"]'))
    expect(hooks.map((h) => h.dataset.motionValue)).toEqual(['90'])
    expect(
      screen.getByText('Not recorded in docs/results/stability_2026-10-25.md'),
    ).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/\s%|undefined|null/)
  })
})
