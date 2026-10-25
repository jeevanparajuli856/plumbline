import { renderHook } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { useSimFocus, type FocusRefs } from './useSimFocus'

function setup() {
  document.body.innerHTML = '<div id="warning" tabindex="-1"></div><input id="field" />'
  const warning = createRef<HTMLElement>() as { current: HTMLElement | null }
  warning.current = document.getElementById('warning')
  const empty = () => ({ current: null })
  const refs: FocusRefs = {
    warning,
    input: empty(),
    diagnosis: empty(),
    refusal: empty(),
    error: empty(),
  }
  return { refs, field: document.getElementById('field') as HTMLInputElement }
}

const frame = () => new Promise((r) => requestAnimationFrame(r))

describe('useSimFocus', () => {
  it('moves focus to the warning after a reading that raised one', async () => {
    const { refs } = setup()
    const { rerender } = renderHook((p) => useSimFocus(p, refs), {
      initialProps: {
        phase: 'submitting' as const,
        hasWarning: true,
        mode: 'replay' as const,
        lastSource: 'replay' as const,
      },
    })
    rerender({
      phase: 'awaiting_reading' as never,
      hasWarning: true,
      mode: 'replay',
      lastSource: 'replay',
    })
    await frame()
    expect(document.activeElement?.id).toBe('warning')
  })

  it('rescues focus to the warning when the focused diagnosis is removed by a rewind', async () => {
    const { refs } = setup()
    const diagnosis = document.createElement('div')
    diagnosis.tabIndex = -1
    document.body.append(diagnosis)
    const { rerender } = renderHook((p) => useSimFocus(p, refs), {
      initialProps: {
        phase: 'resolved' as never,
        hasWarning: false,
        mode: 'replay' as const,
        lastSource: 'replay' as const,
      },
    })
    diagnosis.focus()
    diagnosis.remove()
    rerender({
      phase: 'awaiting_reading' as never,
      hasWarning: true,
      mode: 'replay',
      lastSource: 'replay',
    })
    await frame()
    expect(document.activeElement?.id).toBe('warning')
  })

  it('rescues focus to the page h1 when the focused warning is removed and none follows', async () => {
    const { refs } = setup()
    const main = document.createElement('main')
    main.innerHTML = '<h1>Touch the red probe to row 3.</h1>'
    document.body.append(main)
    const banner = refs.warning.current as HTMLElement
    const { rerender } = renderHook((p) => useSimFocus(p, refs), {
      initialProps: {
        phase: 'awaiting_reading' as never,
        hasWarning: true,
        mode: 'replay' as const,
        lastSource: 'replay' as const,
      },
    })
    banner.focus()
    banner.remove()
    ;(refs.warning as { current: HTMLElement | null }).current = null
    rerender({
      phase: 'awaiting_reading' as never,
      hasWarning: false,
      mode: 'replay',
      lastSource: 'replay',
    })
    await frame()
    expect(document.activeElement?.tagName).toBe('H1')
  })

  it('leaves focus alone when the person moved it away themselves', async () => {
    const { refs, field } = setup()
    const { rerender } = renderHook((p) => useSimFocus(p, refs), {
      initialProps: {
        phase: 'awaiting_reading' as never,
        hasWarning: true,
        mode: 'replay' as const,
        lastSource: 'replay' as const,
      },
    })
    field.focus()
    field.blur()
    rerender({
      phase: 'awaiting_reading' as never,
      hasWarning: false,
      mode: 'replay',
      lastSource: 'replay',
    })
    await frame()
    expect(document.activeElement).toBe(document.body)
  })

  it('does not steal focus the person moved before the frame', async () => {
    const { refs, field } = setup()
    const { rerender } = renderHook((p) => useSimFocus(p, refs), {
      initialProps: {
        phase: 'submitting' as const,
        hasWarning: true,
        mode: 'replay' as const,
        lastSource: 'replay' as const,
      },
    })
    rerender({
      phase: 'awaiting_reading' as never,
      hasWarning: true,
      mode: 'replay',
      lastSource: 'replay',
    })
    field.focus()
    await frame()
    expect(document.activeElement).toBe(field)
  })
})
