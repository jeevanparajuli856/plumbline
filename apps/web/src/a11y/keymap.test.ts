import { describe, expect, it } from 'vitest'
import {
  isActivatableTarget,
  isEditableTarget,
  resolveKey,
  SHORTCUTS,
  type KeyInput,
} from './keymap'

function key(k: string, overrides: Partial<KeyInput> = {}): KeyInput {
  return {
    key: k,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    target: document.body,
    ...overrides,
  }
}

function el(html: string): Element {
  const host = document.createElement('div')
  host.innerHTML = html
  return host.firstElementChild!
}

describe('resolveKey', () => {
  it('maps digits 1 to 9 to aiming at the zero-based site', () => {
    expect(resolveKey(key('1'))).toEqual({ type: 'aim', site: 0 })
    expect(resolveKey(key('9'))).toEqual({ type: 'aim', site: 8 })
    expect(resolveKey(key('0'))).toBeNull()
  })

  it('maps letters regardless of case', () => {
    expect(resolveKey(key('t'))).toEqual({ type: 'focusInput' })
    expect(resolveKey(key('T'))).toEqual({ type: 'focusInput' })
    expect(resolveKey(key('m'))).toEqual({ type: 'listen' })
    expect(resolveKey(key('v'))).toEqual({ type: 'speech' })
    expect(resolveKey(key('r'))).toEqual({ type: 'repeat' })
    expect(resolveKey(key('l'))).toEqual({ type: 'log' })
    expect(resolveKey(key('P'))).toEqual({ type: 'playPause' })
  })

  it('maps brackets, question mark and Escape', () => {
    expect(resolveKey(key('['))).toEqual({ type: 'previous' })
    expect(resolveKey(key(']'))).toEqual({ type: 'next' })
    expect(resolveKey(key('?'))).toEqual({ type: 'help' })
    expect(resolveKey(key('Escape'))).toEqual({ type: 'escape' })
  })

  it('ignores every shortcut while Ctrl, Meta or Alt is held', () => {
    expect(resolveKey(key('t', { ctrlKey: true }))).toBeNull()
    expect(resolveKey(key('r', { metaKey: true }))).toBeNull()
    expect(resolveKey(key('1', { altKey: true }))).toBeNull()
    expect(resolveKey(key('Escape', { metaKey: true }))).toBeNull()
  })

  it('ignores single keys, Enter and Escape inside editable targets so they keep native behavior', () => {
    for (const html of [
      '<input />',
      '<textarea></textarea>',
      '<select></select>',
      '<div contenteditable="true"></div>',
    ]) {
      const target = el(html)
      expect(resolveKey(key('t', { target }))).toBeNull()
      expect(resolveKey(key('Enter', { target }))).toBeNull()
      expect(resolveKey(key('Escape', { target }))).toBeNull()
    }
  })

  it('submits on Enter only when focus is not on something Enter already activates', () => {
    expect(resolveKey(key('Enter'))).toEqual({ type: 'submit' })
    expect(resolveKey(key('Enter', { target: el('<button>Go</button>') }))).toBeNull()
    expect(resolveKey(key('Enter', { target: el('<a href="/x">x</a>') }))).toBeNull()
    expect(resolveKey(key('Enter', { target: el('<div role="switch"></div>') }))).toBeNull()
  })

  it('drops single-character keys but keeps Enter and Esc when single-key shortcuts are off', () => {
    const off = { singleKeys: false }
    expect(resolveKey(key('t'), off)).toBeNull()
    expect(resolveKey(key('3'), off)).toBeNull()
    expect(resolveKey(key(']'), off)).toBeNull()
    expect(resolveKey(key('?'), off)).toBeNull()
    expect(resolveKey(key('Enter'), off)).toEqual({ type: 'submit' })
    expect(resolveKey(key('Escape'), off)).toEqual({ type: 'escape' })
    expect(resolveKey(key('t'), { singleKeys: true })).toEqual({ type: 'focusInput' })
  })

  it('leaves unknown keys alone', () => {
    expect(resolveKey(key('x'))).toBeNull()
    expect(resolveKey(key(' '))).toBeNull()
    expect(resolveKey(key('Tab'))).toBeNull()
  })
})

describe('target guards', () => {
  it('treats null and non-elements as not editable and not activatable', () => {
    expect(isEditableTarget(null)).toBe(false)
    expect(isActivatableTarget(null)).toBe(false)
    expect(isEditableTarget(window)).toBe(false)
  })

  it('detects contenteditable descendants', () => {
    const host = el('<div contenteditable="true"><span>x</span></div>')
    document.body.appendChild(host)
    expect(isEditableTarget(host.firstElementChild)).toBe(true)
    host.remove()
  })
})

describe('SHORTCUTS', () => {
  it('documents every action with an aria-keyshortcuts value and a label', () => {
    const actions = SHORTCUTS.map((s) => s.action)
    for (const action of [
      'aim',
      'submit',
      'focusInput',
      'listen',
      'speech',
      'repeat',
      'log',
      'playPause',
      'previous',
      'next',
      'help',
      'escape',
    ])
      expect(actions).toContain(action)
    for (const s of SHORTCUTS) {
      expect(s.aria.length).toBeGreaterThan(0)
      expect(s.label.length).toBeGreaterThan(0)
    }
  })
})
