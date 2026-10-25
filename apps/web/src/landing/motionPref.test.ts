import {
  REDUCE_MOTION_KEY,
  readStoredReduceMotion,
  useMotionPref,
  writeStoredReduceMotion,
} from './motionPref'

describe('reduce motion preference', () => {
  beforeEach(() => localStorage.clear())

  it('reads off by default and round-trips through storage', () => {
    expect(readStoredReduceMotion()).toBe(false)
    writeStoredReduceMotion(true)
    expect(localStorage.getItem(REDUCE_MOTION_KEY)).toBe('1')
    expect(readStoredReduceMotion()).toBe(true)
    writeStoredReduceMotion(false)
    expect(readStoredReduceMotion()).toBe(false)
  })

  it('survives storage that throws', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(readStoredReduceMotion(throwing)).toBe(false)
    expect(() => writeStoredReduceMotion(true, throwing)).not.toThrow()
    expect(readStoredReduceMotion(null)).toBe(false)
  })

  it('persists the switch when the store changes', () => {
    useMotionPref.getState().setUserReduced(true)
    expect(useMotionPref.getState().userReduced).toBe(true)
    expect(localStorage.getItem(REDUCE_MOTION_KEY)).toBe('1')
    useMotionPref.getState().setUserReduced(false)
  })
})
