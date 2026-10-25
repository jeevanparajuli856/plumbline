import { fireEvent, render, screen, within } from '@testing-library/react'
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
import { REVEAL_MS, revealRadius, toggleTarget } from './themeReveal'
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

describe('theme toggle math', () => {
  it('flips the resolved appearance; high contrast goes to light', () => {
    expect(toggleTarget('light')).toBe('dark')
    expect(toggleTarget('dark')).toBe('light')
    expect(toggleTarget('hc')).toBe('light')
  })

  it('grows the reveal to the farthest viewport corner', () => {
    expect(revealRadius(0, 0, 300, 400)).toBe(500)
    expect(revealRadius(300, 400, 300, 400)).toBe(500)
    expect(revealRadius(150, 200, 300, 400)).toBe(250)
    expect(REVEAL_MS).toBeGreaterThanOrEqual(400)
    expect(REVEAL_MS).toBeLessThanOrEqual(600)
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
    // A press, not an elevation: real controls scale a touch and shift background.
    expect(buttonClass('primary')).toContain('active:scale-[0.98]')
    expect(buttonClass('ink')).toContain('active:scale-[0.98]')
    expect(buttonClass('quiet')).not.toContain('active:scale-[0.98]')
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
  it('renders the Theme radios and both switches and sets each', () => {
    render(<DisplaySettings />)
    expect(
      within(screen.getByRole('radiogroup', { name: 'Theme' }))
        .getAllByRole('radio')
        .map((r) => r.textContent),
    ).toEqual(['System', 'Light', 'Dark', 'High contrast'])
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
  it('previews the nav pill on hover and holds it on the current page', () => {
    render(
      <MemoryRouter initialEntries={['/evidence']}>
        <SiteHeader />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: 'Evidence' })
    expect(link).toHaveAttribute('aria-current', 'page')
    expect(link.className).toContain('rounded-full')
    expect(link.className).toContain('hover:bg-surface-2')
    expect(link.className).toContain('aria-[current=page]:bg-surface-2')
    expect(screen.getByRole('banner')).toHaveClass('site-header')
  })

  it('marks the current page and keeps names out of both', () => {
    render(
      <MemoryRouter initialEntries={['/accessibility']}>
        <SiteHeader />
        <SiteFooter />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Accessibility' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Truehand' })).toHaveAttribute('href', '/')
    expect(document.body).not.toHaveTextContent(/Plumbline|Louisiana|Parajuli/)
  })
})
