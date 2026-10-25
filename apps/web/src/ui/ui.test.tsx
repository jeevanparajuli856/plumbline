import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { Badge } from './Badge'
import { KeyboardMapDialog } from './KeyboardMapDialog'
import { PrefsBar } from './PrefsBar'
import { nextRadioIndex } from './radioNav'
import { RadioGroup } from './RadioGroup'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'
import { Switch } from './Switch'
import { systemThemeClass } from './useSystemTheme'
import { buttonClass } from './button'
import { usePrefs } from '@/state/prefs'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

describe('nextRadioIndex', () => {
  it('wraps arrows, handles Home and End, ignores other keys', () => {
    expect(nextRadioIndex(0, 'ArrowRight', 3)).toBe(1)
    expect(nextRadioIndex(2, 'ArrowDown', 3)).toBe(0)
    expect(nextRadioIndex(0, 'ArrowLeft', 3)).toBe(2)
    expect(nextRadioIndex(1, 'ArrowUp', 3)).toBe(0)
    expect(nextRadioIndex(1, 'Home', 3)).toBe(0)
    expect(nextRadioIndex(0, 'End', 3)).toBe(2)
    expect(nextRadioIndex(0, 'a', 3)).toBeNull()
    expect(nextRadioIndex(0, 'ArrowRight', 0)).toBeNull()
  })
})

describe('systemThemeClass', () => {
  it('prefers high contrast over dark', () => {
    expect(systemThemeClass(true, true)).toBe('prefers-hc')
    expect(systemThemeClass(true, false)).toBe('prefers-dark')
    expect(systemThemeClass(false, false)).toBeNull()
  })
})

describe('RadioGroup', () => {
  it('exposes a named radiogroup with roving tabindex and arrow selection', () => {
    const onChange = vi.fn()
    render(
      <RadioGroup
        label="Mode"
        value="replay"
        onChange={onChange}
        options={[
          { value: 'simulate', label: 'Simulate' },
          { value: 'replay', label: 'Replay' },
        ]}
      />,
    )
    expect(screen.getByRole('radiogroup', { name: 'Mode' })).toBeInTheDocument()
    const replay = screen.getByRole('radio', { name: 'Replay' })
    expect(replay).toHaveAttribute('aria-checked', 'true')
    expect(replay).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('radio', { name: 'Simulate' })).toHaveAttribute('tabindex', '-1')
    fireEvent.keyDown(replay, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('simulate')
    fireEvent.click(screen.getByRole('radio', { name: 'Simulate' }))
    expect(onChange).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(replay, { key: 'x' })
    expect(onChange).toHaveBeenCalledTimes(2)
  })
})

describe('Switch', () => {
  it('names itself by its label only and toggles', () => {
    const onChange = vi.fn()
    render(
      <Switch
        label="Speech"
        checked={false}
        onChange={onChange}
        keyshortcut="V"
        keyHint="V"
        description="Off by default."
      />,
    )
    const sw = screen.getByRole('switch', { name: 'Speech' })
    expect(sw).toHaveAttribute('aria-checked', 'false')
    expect(sw).toHaveAttribute('aria-keyshortcuts', 'V')
    expect(sw).toHaveAccessibleDescription('Off by default.')
    fireEvent.click(sw)
    expect(onChange).toHaveBeenCalledWith(true)
  })
})

describe('Badge and buttons', () => {
  it('renders the status word as text with the test id', () => {
    render(<Badge kind="PENDING" qualifier="engine" />)
    expect(screen.getByTestId('badge')).toHaveTextContent('engine PENDING')
  })

  it('composes button classes per variant', () => {
    expect(buttonClass('primary')).toContain('bg-text')
    expect(buttonClass('quiet', 'x-extra')).toContain('x-extra')
    expect(buttonClass()).toContain('border-border-strong')
  })
})

describe('KeyboardMapDialog', () => {
  it('opens as a named dialog listing the map and closes', () => {
    const onClose = vi.fn()
    const { rerender } = render(<KeyboardMapDialog open onClose={onClose} />)
    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' })
    expect(dialog).toHaveAttribute('open')
    expect(screen.getByText('Repeat the instruction')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
    rerender(<KeyboardMapDialog open={false} onClose={onClose} />)
    expect(dialog).not.toHaveAttribute('open')
  })
})

describe('PrefsBar', () => {
  it('sets the theme, text only and reduce motion', () => {
    render(<PrefsBar />)
    fireEvent.click(screen.getByRole('radio', { name: 'High contrast' }))
    expect(usePrefs.getState().theme).toBe('hc')
    fireEvent.click(screen.getByRole('switch', { name: 'Text only' }))
    expect(usePrefs.getState().textOnly).toBe(true)
    const reduce = screen.getByRole('switch', { name: 'Reduce motion' })
    fireEvent.click(reduce)
    expect(reduce).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(reduce)
    usePrefs.setState({ theme: 'system', textOnly: false })
  })
})

describe('SiteHeader and SiteFooter', () => {
  it('marks the current page and names the team only in the footer', () => {
    render(
      <MemoryRouter initialEntries={['/evidence']}>
        <SiteHeader />
        <SiteFooter />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Validation' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('contentinfo')).toHaveTextContent('University of Louisiana Monroe')
    expect(screen.getByRole('banner')).not.toHaveTextContent('Louisiana')
  })
})
