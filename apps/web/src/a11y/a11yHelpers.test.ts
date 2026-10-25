import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyQueue, readQueue, replaceQueue } from './liveQueue'
import { applyReduceMotion, useMotionPref } from './motionPref'
import { currentPhrase, repeatInstruction } from './repeatInstruction'
import { registerShortcut } from './shortcutRegistry'
import { dispatchShortcut, useKeyboardMap } from './useKeyboardMap'
import { prefersReducedMotion, useReducedMotion } from './useReducedMotion'
import { focusHeading, useRouteFocus } from './useRouteFocus'
import type { Catalog, SessionData } from '@/state/types'

const catalog: Catalog = {
  domain: 'circuit',
  simulated: false,
  readingUnit: 'V',
  sigma: 0.02,
  hypotheses: [
    {
      id: 'R3_10x_low',
      label: 'R3 is ten times too small',
      spoken: 'R3 is ten times too small',
      description: '',
    },
    { id: 'LED_open', label: 'LED is open', spoken: 'LED open', description: '' },
    { id: 'LED_reversed', label: 'LED is backwards', spoken: 'LED reversed', description: '' },
  ],
  sites: [
    { index: 0, label: 'row 1', spoken: 'row 1' },
    { index: 1, label: 'row 2', spoken: 'row 2' },
    { index: 2, label: 'row 3', spoken: 'row 3' },
  ],
  classes: [['R3_10x_low'], ['LED_open', 'LED_reversed']],
}

type Readable = Parameters<typeof currentPhrase>[0]

function state(overrides: Partial<SessionData> = {}): Readable {
  return {
    domain: 'circuit',
    phase: 'awaiting_reading',
    catalog,
    instruction: { site: 2, label: 'row 3', spoken: 'row 3', gainBits: [] },
    diagnosis: null,
    unresolved: null,
    ...overrides,
  }
}

describe('currentPhrase and repeatInstruction', () => {
  beforeEach(() => replaceQueue(emptyQueue))

  it('repeats the instruction phrase from domains while awaiting a reading', () => {
    expect(currentPhrase(state())).toBe('Touch the red probe to row 3. Say or type the reading.')
  })

  it('repeats the diagnosis once resolved', () => {
    const s = state({
      phase: 'resolved',
      diagnosis: {
        hypothesisId: 'R3_10x_low',
        label: 'R3 is ten times too small',
        confidence: 0.975,
        spoken: '',
      },
    })
    expect(currentPhrase(s)).toBe('R3 is ten times too small. Confidence 98%.')
  })

  it('repeats the refusal, building it from the pair when the engine sent no text', () => {
    const s = state({
      phase: 'unresolved',
      unresolved: {
        classes: [['LED_open', 'LED_reversed']],
        reason: 'indistinguishable',
        text: '',
      },
    })
    expect(currentPhrase(s)).toContain('I will not guess')
    expect(currentPhrase(s)).toContain('LED open from LED reversed')
  })

  it('returns null without a catalog or instruction', () => {
    expect(currentPhrase(state({ catalog: null }))).toBeNull()
    expect(currentPhrase(state({ instruction: null }))).toBeNull()
  })

  it('forces the announcement past the dedupe window', () => {
    expect(repeatInstruction(state())).toBe(true)
    expect(repeatInstruction(state())).toBe(true)
    expect(readQueue().polite).toHaveLength(2)
    expect(repeatInstruction(state({ catalog: null }))).toBe(false)
  })
})

describe('shortcut dispatch', () => {
  it('prefers page handlers, falls back to the registry, and reports unhandled keys', () => {
    const page = vi.fn()
    const shared = vi.fn()
    const unregister = registerShortcut('listen', shared)
    expect(dispatchShortcut({ type: 'next' }, { next: page })).toBe(true)
    expect(page).toHaveBeenCalledWith({ type: 'next' })
    expect(dispatchShortcut({ type: 'listen' }, {})).toBe(true)
    expect(shared).toHaveBeenCalledOnce()
    unregister()
    expect(dispatchShortcut({ type: 'listen' }, {})).toBe(false)
  })

  it('does not let a stale unregister remove a newer handler', () => {
    const first = registerShortcut('listen', vi.fn())
    const second = vi.fn()
    const unregisterSecond = registerShortcut('listen', second)
    first()
    expect(dispatchShortcut({ type: 'listen' }, {})).toBe(true)
    unregisterSecond()
  })

  it('listens on window, prevents default when handled, and ignores inputs', () => {
    const aim = vi.fn()
    const { unmount } = renderHook(() => useKeyboardMap({ aim }))
    const event = new KeyboardEvent('keydown', { key: '3', cancelable: true })
    window.dispatchEvent(event)
    expect(aim).toHaveBeenCalledWith({ type: 'aim', site: 2 })
    expect(event.defaultPrevented).toBe(true)
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true }))
    expect(aim).toHaveBeenCalledTimes(1)
    input.remove()
    unmount()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }))
    expect(aim).toHaveBeenCalledTimes(1)
  })

  it('does nothing while disabled', () => {
    const help = vi.fn()
    renderHook(() => useKeyboardMap({ help }, false))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))
    expect(help).not.toHaveBeenCalled()
  })
})

describe('reduce motion', () => {
  afterEach(() => {
    useMotionPref.getState().setReduceMotion(false)
    applyReduceMotion(false)
  })

  it('the in-page switch reduces motion on top of the OS setting and persists', () => {
    expect(prefersReducedMotion()).toBe(false)
    useMotionPref.getState().setReduceMotion(true)
    expect(prefersReducedMotion()).toBe(true)
    expect(localStorage.getItem('plumbline.reduceMotion')).toBe('1')
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })

  it('mirrors the switch onto the html element', () => {
    applyReduceMotion(true)
    expect(document.documentElement.dataset.reduceMotion).toBe('true')
    applyReduceMotion(false)
    expect(document.documentElement.dataset.reduceMotion).toBeUndefined()
  })
})

describe('route focus', () => {
  it('focuses the main h1, adding tabindex when missing', () => {
    document.body.innerHTML = '<main><h1>Title</h1></main>'
    expect(focusHeading()).toBe(true)
    expect(document.activeElement?.tagName).toBe('H1')
    document.body.innerHTML = ''
    expect(focusHeading()).toBe(false)
  })

  it('skips the first render and focuses after a pathname change', async () => {
    document.body.innerHTML = '<button>first</button><main><h1>Title</h1></main>'
    const button = document.querySelector('button')!
    button.focus()
    const { rerender } = renderHook(({ path }) => useRouteFocus(path), {
      initialProps: { path: '/' },
    })
    await new Promise((r) => requestAnimationFrame(r))
    expect(document.activeElement).toBe(button)
    rerender({ path: '/sim' })
    await new Promise((r) => requestAnimationFrame(r))
    expect(document.activeElement?.tagName).toBe('H1')
    document.body.innerHTML = ''
  })
})
