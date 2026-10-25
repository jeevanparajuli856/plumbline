import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { SimToolbar } from './SimToolbar'

function renderToolbar() {
  render(
    <MemoryRouter>
      <SimToolbar
        domain="circuit"
        mode="replay"
        simulated={false}
        speech={false}
        health="ok"
        onDomain={vi.fn()}
        onMode={vi.fn()}
        onSpeech={vi.fn()}
        onShortcuts={vi.fn()}
        onRetryHealth={vi.fn()}
      />
    </MemoryRouter>,
  )
  return screen.getByRole('region', { name: 'Web app settings' })
}

describe('SimToolbar', () => {
  it('keeps the instrument settings and Reduce motion, and leaves theme and Text only to Accessibility', () => {
    const toolbar = renderToolbar()
    expect(within(toolbar).getByRole('radiogroup', { name: 'Instrument' })).toBeInTheDocument()
    expect(within(toolbar).getByRole('radio', { name: 'Simulate' })).toBeInTheDocument()
    expect(within(toolbar).getByRole('switch', { name: 'Speech' })).toBeInTheDocument()
    expect(within(toolbar).getAllByRole('switch', { name: 'Reduce motion' })).toHaveLength(1)
    expect(within(toolbar).getByRole('button', { name: /Keyboard shortcuts/ })).toBeInTheDocument()
    expect(within(toolbar).queryByRole('radiogroup', { name: 'Theme' })).not.toBeInTheDocument()
    expect(within(toolbar).queryByRole('switch', { name: 'Text only' })).not.toBeInTheDocument()
  })

  it('links to the display settings on /accessibility in one step', () => {
    const toolbar = renderToolbar()
    expect(within(toolbar).getByRole('link', { name: 'Display settings' })).toHaveAttribute(
      'href',
      '/accessibility',
    )
  })

  it('never says simulator in its copy', () => {
    const toolbar = renderToolbar()
    expect(toolbar).not.toHaveTextContent(/simulator/i)
    expect(within(toolbar).getByRole('button', { name: 'Web app settings' })).toBeInTheDocument()
  })
})
