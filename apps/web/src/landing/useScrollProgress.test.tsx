import { renderHook } from '@testing-library/react'
import { useScrollProgress } from './useScrollProgress'

describe('useScrollProgress', () => {
  let root: HTMLElement
  let setTimeoutSpy: ReturnType<typeof vi.spyOn>
  let rafSpy: ReturnType<typeof vi.spyOn>
  let scrollToSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    root = document.createElement('main')
    document.body.appendChild(root)
    setTimeoutSpy = vi.spyOn(window, 'setTimeout')
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
    scrollToSpy = vi.fn()
    window.scrollTo = scrollToSpy as unknown as typeof window.scrollTo
    renderHook(() => useScrollProgress({ current: root }, false))
    setTimeoutSpy.mockClear()
    rafSpy.mockClear()
  })

  afterEach(() => {
    setTimeoutSpy.mockRestore()
    rafSpy.mockRestore()
    root.remove()
  })

  it('recomputes progress on scroll and on resize', () => {
    window.dispatchEvent(new Event('scroll'))
    expect(rafSpy).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new Event('resize'))
    expect(rafSpy).toHaveBeenCalled()
  })

  it('never moves the page by itself, however the reader scrolls or stops', () => {
    window.dispatchEvent(new Event('pointerdown'))
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('pointerup'))
    window.dispatchEvent(new Event('scroll'))
    expect(setTimeoutSpy).not.toHaveBeenCalled()
    expect(scrollToSpy).not.toHaveBeenCalled()
  })
})
