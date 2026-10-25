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
