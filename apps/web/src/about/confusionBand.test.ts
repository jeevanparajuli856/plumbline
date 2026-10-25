import { describe, expect, it } from 'vitest'
import { loadFixture } from '@/state/replay'
import { confusionBand } from './confusionBand'

describe('confusionBand', () => {
  it('reads the assumed band from the engine-recorded matrix', async () => {
    const fx = await loadFixture('worked_example')
    expect(confusionBand(fx.config.confusion)).toEqual({ p_same: 0.78, p_pm1: 0.08, p_pm2: 0.03 })
  })

  it('accepts the three-number form', () => {
    expect(confusionBand({ p_same: 0.7, p_pm1: 0.1, p_pm2: 0.05 })).toEqual({
      p_same: 0.7,
      p_pm1: 0.1,
      p_pm2: 0.05,
    })
  })

  it('returns null for anything else', () => {
    expect(confusionBand(undefined)).toBeNull()
    expect(confusionBand([[1]])).toBeNull()
    expect(confusionBand({ p_same: '0.78' })).toBeNull()
  })
})
