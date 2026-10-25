import { describe, expect, it } from 'vitest'
import { drainPolite, emptyQueue, enqueue, takeAssertive } from './liveQueue'

describe('live region queue', () => {
  it('drops an exact duplicate inside the dedupe window', () => {
    const s1 = enqueue(emptyQueue, 'Touch row 3.', 0)
    const s2 = enqueue(s1, 'Touch row 3.', 500)
    expect(s2.polite).toHaveLength(1)
  })

  it('keeps a duplicate when forced or after the window', () => {
    const s1 = enqueue(emptyQueue, 'Touch row 3.', 0)
    expect(enqueue(s1, 'Touch row 3.', 100, { force: true }).polite).toHaveLength(2)
    expect(enqueue(s1, 'Touch row 3.', 2000).polite).toHaveLength(2)
  })

  it('an assertive message clears the polite queue and interrupts', () => {
    const s1 = enqueue(emptyQueue, 'a', 0)
    const s2 = enqueue(s1, 'b', 10)
    const s3 = enqueue(s2, 'Warning.', 20, { priority: 'assertive' })
    expect(s3.polite).toHaveLength(0)
    expect(takeAssertive(s3).next?.text).toBe('Warning.')
  })

  it('drains polite messages one at a time in order', () => {
    const s = enqueue(enqueue(emptyQueue, 'first', 0), 'second', 10)
    const d1 = drainPolite(s)
    const d2 = drainPolite(d1.state)
    expect(d1.next?.text).toBe('first')
    expect(d2.next?.text).toBe('second')
    expect(drainPolite(d2.state).next).toBeNull()
  })
})
