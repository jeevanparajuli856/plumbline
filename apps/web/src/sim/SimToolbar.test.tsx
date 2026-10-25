import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SimToolbar } from './SimToolbar'

function renderToolbar() {
  render(
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
    />,
  )
  return screen.getByRole('region', { name: 'Web app settings' })
}

describe('SimToolbar', () => {
  it('carries the display controls once each, beside the instrument settings', () => {
    const toolbar = renderToolbar()
    expect(within(toolbar).getAllByRole('radiogroup', { name: 'Theme' })).toHaveLength(1)
    expect(within(toolbar).getAllByRole('switch', { name: 'Reduce motion' })).toHaveLength(1)
    expect(within(toolbar).getAllByRole('switch', { name: 'Text only' })).toHaveLength(1)
    expect(within(toolbar).getByRole('switch', { name: 'Speech' })).toBeInTheDocument()
    expect(within(toolbar).getByRole('radio', { name: 'Simulate' })).toBeInTheDocument()
  })

  it('never says simulator in its copy', () => {
    const toolbar = renderToolbar()
    expect(toolbar).not.toHaveTextContent(/simulator/i)
    expect(within(toolbar).getByRole('button', { name: 'Web app settings' })).toBeInTheDocument()
  })
})
