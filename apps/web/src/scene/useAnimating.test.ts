import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { acquireAnimation, animationCount, useAnimating, useAnimationWhile } from './useAnimating'

describe('useAnimating', () => {
  it('is true while any lease is held and false at zero', () => {
    const { result } = renderHook(() => useAnimating())
    expect(result.current).toBe(false)
    let a: () => void = () => {}
    let b: () => void = () => {}
    act(() => {
      a = acquireAnimation()
      b = acquireAnimation()
    })
    expect(result.current).toBe(true)
    act(() => a())
    expect(result.current).toBe(true)
    act(() => b())
    expect(result.current).toBe(false)
  })

  it('ignores a double release', () => {
    const release = acquireAnimation()
    release()
    release()
    expect(animationCount()).toBe(0)
  })

  it('holds a lease only while the condition is true and releases on unmount', () => {
    const { rerender, unmount } = renderHook(({ on }) => useAnimationWhile(on), {
      initialProps: { on: true },
    })
    expect(animationCount()).toBe(1)
    rerender({ on: false })
    expect(animationCount()).toBe(0)
    rerender({ on: true })
    unmount()
    expect(animationCount()).toBe(0)
  })
})
