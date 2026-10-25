import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const toggleListen = vi.fn()
let listening = false
vi.mock('@/voice', () => ({
  useVoice: () => ({ supported: true, listening, toggleListen, speakingEnabled: false }),
}))

const { ListenButton } = await import('./ListenButton')

describe('ListenButton', () => {
  it('toggles listening, names its shortcut and reports its state', () => {
    const { rerender } = render(<ListenButton />)
    const button = screen.getByRole('button', { name: 'Listen' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).toHaveAttribute('aria-keyshortcuts', 'M')
    fireEvent.click(button)
    expect(toggleListen).toHaveBeenCalledOnce()
    listening = true
    rerender(<ListenButton />)
    expect(screen.getByRole('button', { name: 'Listen' })).toHaveAttribute('aria-pressed', 'true')
  })
})
