import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { AnnounceOptions } from '@/a11y/liveQueue'
import { DOMAINS } from '@/state/domains'
import { usePrefs } from '@/state/prefs'
import { useSession } from '@/state/session'
import { cancelListen, readVoiceStatus, startVoice, toggleListen, useVoice } from './index'
import type { ListenAdapter } from './listen'
import { voicePhrases } from './phrases'
import { focusReadingInput } from './runtime'
import type { SpeechPort } from './speak'
import { createFakeAdapter } from './stubs/fakeRecognition'

interface FakePort extends SpeechPort {
  spoken: string[]
  finish(): void
}

function fakePort(): FakePort {
  const pending: Array<() => void> = []
  const port: FakePort = {
    spoken: [],
    speak(text, onDone) {
      port.spoken.push(text)
      pending.push(onDone)
    },
    cancel() {},
    finish() {
      pending.shift()?.()
    },
  }
  return port
}

const flush = async () => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve()
}

function finishRevealIfAny() {
  const s = useSession.getState()
  if (s.phase === 'revealing' && s.reveal) s.finishReveal(s.reveal.token)
}

let adapter: ReturnType<typeof createFakeAdapter>
let port: FakePort
let announce: Mock<(text: string, options: AnnounceOptions) => void>
let focusTyped: Mock<() => void>
let repeat: Mock<() => void>
let stop: () => void

function start(overrides: { adapter?: ListenAdapter } = {}) {
  stop = startVoice({ adapter: overrides.adapter ?? adapter, port, announce, focusTyped, repeat })
}

beforeEach(async () => {
  usePrefs.setState({ voiceEnabled: false })
  adapter = createFakeAdapter()
  port = fakePort()
  announce = vi.fn<(text: string, options: AnnounceOptions) => void>()
  focusTyped = vi.fn<() => void>()
  repeat = vi.fn<() => void>()
  await useSession.getState().start({ mode: 'replay', fixture: 'worked_example' })
})

afterEach(() => stop?.())

describe('useVoice', () => {
  it('reports support, listening and the speech preference', () => {
    start()
    const { result } = renderHook(() => useVoice())
    expect(result.current).toMatchObject({ supported: true, listening: false, speakingEnabled: false })
    act(() => result.current.toggleListen())
    expect(result.current.listening).toBe(true)
    act(() => usePrefs.setState({ voiceEnabled: true }))
    expect(result.current.speakingEnabled).toBe(true)
  })

  it('is unsupported before startVoice and after cleanup', () => {
    const { result } = renderHook(() => useVoice())
    expect(result.current.supported).toBe(false)
    start()
    act(() => stop())
    expect(result.current.supported).toBe(false)
    act(() => toggleListen())
    expect(result.current.listening).toBe(false)
  })
})

describe('voice loop', () => {
  it('submits a spoken reading through the store as a voice reading', async () => {
    start()
    toggleListen()
    adapter.say('three point six seven one volts')
    await flush()
    finishRevealIfAny()
    const reading = useSession.getState().readings[0]
    expect(reading).toMatchObject({ value: 3.671, source: 'voice' })
    expect(readVoiceStatus()).toBe('idle')
  })

  it('confirms disagreeing alternatives, then submits on yes', async () => {
    start()
    toggleListen()
    adapter.say('3.671', ['3.67'])
    await flush()
    expect(readVoiceStatus()).toBe('confirming')
    expect(announce).toHaveBeenCalledWith(voicePhrases.heardConfirm(3.671, DOMAINS.circuit), {
      priority: 'polite',
    })
    adapter.say('yes')
    await flush()
    finishRevealIfAny()
    expect(useSession.getState().readings[0]?.value).toBe(3.671)
  })

  it('does not submit when the session is not waiting for a reading', async () => {
    start()
    useSession.setState({ phase: 'resolved' })
    toggleListen()
    adapter.say('3.671')
    await flush()
    expect(useSession.getState().readings).toHaveLength(0)
    expect(announce).toHaveBeenCalledWith(voicePhrases.notAwaiting, { priority: 'polite' })
  })

  it('Esc cancels listening and says so', async () => {
    start()
    toggleListen()
    cancelListen()
    await flush()
    expect(readVoiceStatus()).toBe('idle')
    expect(announce).toHaveBeenCalledWith(voicePhrases.stopped, { priority: 'polite' })
    adapter.say('3.671')
    await flush()
    expect(useSession.getState().readings).toHaveLength(0)
  })

  it('reports a recognition error and returns to idle', async () => {
    const failing: ListenAdapter = {
      isSupported: () => true,
      start: () => Promise.reject(Object.assign(new Error('x'), { code: 'no-speech' })),
      abort: () => {},
    }
    start({ adapter: failing })
    toggleListen()
    await flush()
    expect(announce).toHaveBeenCalledWith(voicePhrases.listenError('no-speech'), { priority: 'polite' })
    expect(readVoiceStatus()).toBe('idle')
  })

  it('without recognition, the microphone key points to typed input', () => {
    start({ adapter: { isSupported: () => false, start: () => Promise.reject(new Error()), abort: () => {} } })
    toggleListen()
    expect(announce).toHaveBeenCalledWith(voicePhrases.unsupported, { priority: 'polite' })
    expect(focusTyped).toHaveBeenCalledOnce()
  })

  it('routes the repeat and type-instead commands', async () => {
    start()
    toggleListen()
    adapter.say('repeat')
    await flush()
    expect(repeat).toHaveBeenCalledOnce()
    toggleListen()
    adapter.say('type instead')
    await flush()
    expect(focusTyped).toHaveBeenCalledOnce()
  })
})

describe('voice output', () => {
  const instruction = () => {
    const s = useSession.getState()
    const site = s.catalog?.sites[s.instruction?.site ?? -1]
    if (!site) throw new Error('no instruction')
    return DOMAINS.circuit.phrases.instruction(site)
  }

  it('stays silent and never announces engine events itself when speech is off', async () => {
    start()
    window.dispatchEvent(new Event('pointerdown'))
    await useSession.getState().start({ mode: 'replay', fixture: 'worked_example' })
    expect(port.spoken).toEqual([''])
    expect(announce).not.toHaveBeenCalled()
  })

  it('speaks engine events after the first gesture when speech is on', async () => {
    usePrefs.setState({ voiceEnabled: true })
    start()
    await useSession.getState().start({ mode: 'replay', fixture: 'worked_example' })
    expect(port.spoken).toEqual([])
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v' }))
    expect(port.spoken).toEqual(['', instruction()])
    expect(announce).not.toHaveBeenCalled()
  })

  it('waits for speech to finish before opening the microphone', async () => {
    usePrefs.setState({ voiceEnabled: true })
    const startSpy = vi.spyOn(adapter, 'start')
    start()
    window.dispatchEvent(new Event('pointerdown'))
    port.finish()
    toggleListen()
    await flush()
    expect(port.spoken.at(-1)).toBe(voicePhrases.listening)
    expect(startSpy).not.toHaveBeenCalled()
    port.finish()
    adapter.say('3.671', ['3.67'])
    await flush()
    expect(port.spoken.at(-1)).toBe(voicePhrases.heardConfirm(3.671, DOMAINS.circuit))
    expect(startSpy).toHaveBeenCalledTimes(1)
    port.finish()
    await flush()
    expect(startSpy).toHaveBeenCalledTimes(2)
  })

  it('stops speaking when speech is turned off', async () => {
    usePrefs.setState({ voiceEnabled: true })
    const cancel = vi.spyOn(port, 'cancel')
    start()
    window.dispatchEvent(new Event('pointerdown'))
    usePrefs.setState({ voiceEnabled: false })
    expect(cancel).toHaveBeenCalled()
  })
})

describe('focusReadingInput', () => {
  it('focuses the reading input by its contract label', () => {
    document.body.innerHTML = '<label>Meter reading in volts <input id="r" /></label><input aria-label="Other" />'
    focusReadingInput(document)
    expect(document.activeElement?.id).toBe('r')
    document.body.innerHTML = '<input id="t" aria-label="Thermometer reading in degrees Celsius" />'
    focusReadingInput(document)
    expect(document.activeElement?.id).toBe('t')
    document.body.innerHTML = ''
  })
})
