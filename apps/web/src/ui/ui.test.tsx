import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { Badge } from './Badge'
import { KeyboardMapDialog } from './KeyboardMapDialog'
import { DisplaySettings } from './DisplaySettings'
import { nextRadioIndex } from './radioNav'
import { RadioGroup } from './RadioGroup'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'
import { Switch } from './Switch'
import { resolvedTheme, systemThemeClass } from './useSystemTheme'
import { nextTrapIndex } from './focusTrap'
import { buttonClass } from './button'
import { usePrefs } from '@/state/prefs'
import { useShortcutPref } from '@/a11y/shortcutPref'

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

describe('resolvedTheme', () => {
  it('follows the OS only for System, high contrast first', () => {
    expect(resolvedTheme('system', false, false)).toBe('light')
    expect(resolvedTheme('system', true, false)).toBe('dark')
    expect(resolvedTheme('system', true, true)).toBe('hc')
    expect(resolvedTheme('light', true, true)).toBe('light')
    expect(resolvedTheme('dark', false, false)).toBe('dark')
    expect(resolvedTheme('hc', false, false)).toBe('hc')
  })
})

describe('nextTrapIndex', () => {
  it('wraps forward from the last and backward from the first, and enters at the edges', () => {
    expect(nextTrapIndex(2, 3, false)).toBe(0)
    expect(nextTrapIndex(0, 3, true)).toBe(2)
    expect(nextTrapIndex(0, 3, false)).toBeNull()
    expect(nextTrapIndex(1, 3, true)).toBeNull()
    expect(nextTrapIndex(-1, 3, false)).toBe(0)
    expect(nextTrapIndex(-1, 3, true)).toBe(2)
    expect(nextTrapIndex(0, 0, false)).toBeNull()
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

describe('RadioGroup with explicit commit', () => {
  const options = [
    { value: 'simulate', label: 'Simulate' },
    { value: 'live', label: 'Live meter' },
    { value: 'replay', label: 'Replay' },
  ] as const

  it('moves a pending choice on arrows and commits only on click', () => {
    const onChange = vi.fn()
    render(
      <RadioGroup
        label="Mode"
        value="replay"
        options={options}
        onChange={onChange}
        commit="explicit"
      />,
    )
    const replay = screen.getByRole('radio', { name: 'Replay' })
    fireEvent.keyDown(replay, { key: 'ArrowLeft' })
    const live = screen.getByRole('radio', { name: 'Live meter' })
    expect(live).toHaveAttribute('aria-checked', 'true')
    fireEvent.keyDown(live, { key: 'ArrowLeft' })
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('radio', { name: 'Simulate' }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith('simulate')
    expect(screen.getByRole('radiogroup', { name: 'Mode' })).toHaveAccessibleDescription(
      'Arrow keys move, Enter or Space chooses, Escape cancels.',
    )
  })

  it('drops the pending choice on Escape and returns to the committed option', () => {
    const onChange = vi.fn()
    render(
      <RadioGroup
        label="Mode"
        value="replay"
        options={options}
        onChange={onChange}
        commit="explicit"
      />,
    )
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Replay' }), { key: 'ArrowLeft' })
    expect(screen.getByRole('radio', { name: 'Live meter' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Live meter' }), { key: 'Escape' })
    const replay = screen.getByRole('radio', { name: 'Replay' })
    expect(replay).toHaveAttribute('aria-checked', 'true')
    expect(document.activeElement).toBe(replay)
    fireEvent.blur(screen.getByRole('radiogroup', { name: 'Mode' }), {
      relatedTarget: document.body,
    })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('commits the pending choice when focus leaves the group, and not when it stays inside', () => {
    const onChange = vi.fn()
    render(
      <>
        <RadioGroup
          label="Mode"
          value="replay"
          options={options}
          onChange={onChange}
          commit="explicit"
        />
        <button type="button">outside</button>
      </>,
    )
    const group = screen.getByRole('radiogroup', { name: 'Mode' })
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Replay' }), { key: 'ArrowLeft' })
    fireEvent.blur(group, { relatedTarget: screen.getByRole('radio', { name: 'Simulate' }) })
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.blur(group, { relatedTarget: screen.getByRole('button', { name: 'outside' }) })
    expect(onChange).toHaveBeenCalledExactlyOnceWith('live')
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

  it('never draws a badge as a pill', () => {
    render(<Badge kind="SIMULATED" title="model" />)
    const badge = screen.getByTestId('badge')
    expect(badge).toHaveAttribute('title', 'model')
    expect(badge.className).not.toContain('rounded-full')
  })

  it('composes button classes per variant: amber primary, ink, line, quiet', () => {
    expect(buttonClass('primary')).toContain('bg-action')
    expect(buttonClass('primary')).toContain('hover:bg-action-hover')
    expect(buttonClass('ink')).toContain('bg-ink')
    expect(buttonClass('line')).toContain('border-border-strong')
    expect(buttonClass('secondary')).toBe(buttonClass('line'))
    expect(buttonClass('quiet', 'x-extra')).toContain('x-extra')
    expect(buttonClass()).toContain('border-border-strong')
    expect(buttonClass('primary')).toContain('rounded-button')
    expect(buttonClass('primary')).not.toContain('translate-y')
    expect(buttonClass('primary')).toContain('disabled:border-dashed')
  })
})

describe('KeyboardMapDialog', () => {
  it('closes before returning focus to the opener and toggles single-key shortcuts', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const { rerender } = render(<KeyboardMapDialog open onClose={() => {}} />)
    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' })
    const sw = screen.getByRole('switch', { name: 'Single-key shortcuts' })
    expect(sw).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(sw)
    expect(useShortcutPref.getState().singleKeys).toBe(false)
    useShortcutPref.getState().setSingleKeys(true)
    rerender(<KeyboardMapDialog open={false} onClose={() => {}} />)
    expect(dialog).not.toHaveAttribute('open')
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

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

describe('DisplaySettings', () => {
  it('sets the theme, text only and reduce motion', () => {
    render(<DisplaySettings />)
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
    expect(screen.getByRole('link', { name: /^Truehand/ })).toHaveAttribute('href', '/')
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Truehand.')
    expect(screen.getByRole('link', { name: 'support@truehand.tech' })).toHaveAttribute(
      'href',
      'mailto:support@truehand.tech',
    )
    expect(document.body).not.toHaveTextContent('Plumbline')
  })
})
