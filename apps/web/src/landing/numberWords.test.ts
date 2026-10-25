import { countWord } from './numberWords'

describe('countWord', () => {
  it('spells small counts and keeps digits beyond the word list', () => {
    expect(countWord(2)).toBe('two')
    expect(countWord(4)).toBe('four')
    expect(countWord(2, true)).toBe('Two')
    expect(countWord(42)).toBe('42')
  })
})
