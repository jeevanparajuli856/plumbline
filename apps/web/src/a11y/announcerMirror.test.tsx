import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startAnnouncer } from './announcer'
import {
  announce,
  emptyQueue,
  readQueue,
  replaceQueue,
  repeatLast,
  resetLiveRegion,
} from './liveQueue'
import { LiveRegion } from './LiveRegion'
import { SkipLinks } from './SkipLinks'
import { useSession } from '@/state/session'

/** Tests for the frozen announcer and live region, written by web-shell (no edits to those files). */
describe('announcer mirror over the worked example', () => {
  let stop: () => void
  beforeEach(() => replaceQueue(emptyQueue))
  afterEach(() => stop?.())

  it('announces the instruction, the accepted reading, the warning assertively and the diagnosis', async () => {
    stop = startAnnouncer()
    await useSession.getState().start({ mode: 'replay', fixture: 'worked_example' })
    expect(readQueue().polite.map((a) => a.text)).toContain(
      'Touch the red probe to row 3. Say or type the reading.',
    )

    await useSession.getState().replayNext()
    const last = readQueue().last
    expect(readQueue().assertive?.text ?? last?.text).toBeDefined()
    expect(readQueue().polite.some((a) => a.text.includes('Touch the red probe to row 3'))).toBe(
      true,
    )
    const texts = [readQueue().assertive?.text, ...readQueue().polite.map((a) => a.text)].join(
      ' | ',
    )
    expect(texts).toContain('Warning. That reading did not come from row 3')

    replaceQueue(emptyQueue)
    await useSession.getState().replayNext()
    const after = [...readQueue().polite.map((a) => a.text)].join(' | ')
    expect(after).toContain('0.338 volts, accepted.')
    expect(after).toContain('R3 is ten times too small. Confidence 98%.')
  })

  it('announces errors assertively', async () => {
    stop = startAnnouncer()
    await useSession.getState().start({ mode: 'replay', fixture: 'worked_example' })
    replaceQueue(emptyQueue)
    await useSession.getState().submitReading(99, 'typed')
    expect(readQueue().assertive?.text).toContain('outside the range')
  })
})

describe('LiveRegion', () => {
  beforeEach(() => resetLiveRegion())

  it('renders polite and assertive sinks and drains announcements into them', async () => {
    render(<LiveRegion />)
    expect(document.getElementById('live-polite')).toHaveAttribute('aria-live', 'polite')
    act(() => announce('Polite hello'))
    await screen.findByText('Polite hello')
    act(() => announce('Loud hello', { priority: 'assertive' }))
    expect(await screen.findByText('Loud hello')).toHaveAttribute('id', 'live-assertive')
    act(() => repeatLast())
    expect(readQueue().last?.text).toBe('Loud hello')
  })
})

describe('SkipLinks', () => {
  it('targets main content', () => {
    render(<SkipLinks />)
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main',
    )
  })
})
