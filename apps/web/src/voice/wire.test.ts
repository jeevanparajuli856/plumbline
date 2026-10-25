import { afterEach, describe, expect, it, vi } from 'vitest'

const toggleListen = vi.fn()
const cancelListen = vi.fn()
const stopVoice = vi.fn()
let status = 'idle'
vi.mock('./index', () => ({
  startVoice: () => stopVoice,
  toggleListen: () => toggleListen(),
  cancelListen: () => cancelListen(),
  readVoiceStatus: () => status,
}))

const { wireVoice } = await import('./wire')
const { registeredShortcut } = await import('@/a11y/shortcutRegistry')

describe('wireVoice', () => {
  afterEach(() => {
    vi.clearAllMocks()
    status = 'idle'
  })

  it('claims M for listening and Esc only while the microphone is open', () => {
    const stop = wireVoice()
    registeredShortcut('listen')?.({ type: 'listen' })
    expect(toggleListen).toHaveBeenCalledOnce()
    expect(registeredShortcut('escape')?.({ type: 'escape' })).toBe(false)
    expect(cancelListen).not.toHaveBeenCalled()
    status = 'listening'
    expect(registeredShortcut('escape')?.({ type: 'escape' })).toBe(true)
    expect(cancelListen).toHaveBeenCalledOnce()
    stop()
  })

  it('releases the shortcuts and stops the runtime on cleanup', () => {
    const stop = wireVoice()
    stop()
    expect(registeredShortcut('listen')).toBeUndefined()
    expect(registeredShortcut('escape')).toBeUndefined()
    expect(stopVoice).toHaveBeenCalledOnce()
  })
})
