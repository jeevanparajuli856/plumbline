import creditsMd from '@docs/IMAGE_CREDITS.md?raw'
import { PHOTOS } from './photos'

describe('stock photos', () => {
  const photos = Object.values(PHOTOS)

  it('credits every photo visibly as a stock photo from its Unsplash page', () => {
    for (const p of photos) {
      expect(p.credit).toMatch(/^Stock photo: .+ on Unsplash$/)
      expect(p.sourceUrl).toMatch(/^https:\/\/unsplash\.com\/photos\//)
      expect(creditsMd).toContain(p.sourceUrl)
    }
  })

  it('describes only what is visible, never our users, study or partner', () => {
    for (const p of photos) {
      expect(p.alt.length).toBeGreaterThan(20)
      expect(p.alt).not.toMatch(/participant|user|Truehand|Plumbline|Louisiana|our |blind/i)
      expect(p.alt).not.toMatch(/—/)
    }
  })

  it('declares intrinsic size and two renditions so layout never shifts', () => {
    for (const p of photos) {
      expect(p.width).toBe(1600)
      expect(p.height).toBeGreaterThan(0)
      expect(p.srcSet).toMatch(/ 800w, .+ 1600w$/)
    }
  })
})
