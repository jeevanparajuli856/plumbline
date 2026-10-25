import { renderHook } from '@testing-library/react'
import { useScrollProgress, SNAP_IDLE_MS } from './useScrollProgress'

function snapTimersArmed(spy: { mock: { calls: unknown[][] } }): number {
  return spy.mock.calls.filter((call) => call[1] === SNAP_IDLE_MS).length
}

describe('useScrollProgress', () => {
  let root: HTMLElement
  let setTimeoutSpy: ReturnType<typeof vi.spyOn>
  let rafSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    root = document.createElement('main')
    document.body.appendChild(root)
    setTimeoutSpy = vi.spyOn(window, 'setTimeout')
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
    renderHook(() => useScrollProgress({ current: root }, false))
    setTimeoutSpy.mockClear()
    rafSpy.mockClear()
  })

  afterEach(() => {
    setTimeoutSpy.mockRestore()
    rafSpy.mockRestore()
    root.remove()
  })

  it('arms the snap after a plain scroll', () => {
    window.dispatchEvent(new Event('scroll'))
    expect(snapTimersArmed(setTimeoutSpy)).toBe(1)
  })

  it('recomputes progress on resize without arming a snap', () => {
    window.dispatchEvent(new Event('resize'))
    expect(rafSpy).toHaveBeenCalled()
    expect(snapTimersArmed(setTimeoutSpy)).toBe(0)
  })

  it('does not arm a snap on pointerup when nothing scrolled while the pointer was down', () => {
    window.dispatchEvent(new Event('pointerdown'))
    window.dispatchEvent(new Event('pointerup'))
    expect(snapTimersArmed(setTimeoutSpy)).toBe(0)
  })

  it('arms a snap on pointerup when a scroll happened while the pointer was down', () => {
    window.dispatchEvent(new Event('pointerdown'))
    window.dispatchEvent(new Event('scroll'))
    expect(snapTimersArmed(setTimeoutSpy)).toBe(0)
    window.dispatchEvent(new Event('pointerup'))
    expect(snapTimersArmed(setTimeoutSpy)).toBe(1)
    setTimeoutSpy.mockClear()
    window.dispatchEvent(new Event('pointerdown'))
    window.dispatchEvent(new Event('pointerup'))
    expect(snapTimersArmed(setTimeoutSpy)).toBe(0)
  })
})
