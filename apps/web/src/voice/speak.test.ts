import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePrefs } from '@/state/prefs'
import { chunkText, createSpeaker, MAX_CHUNK_CHARS, webSpeechPort, type SpeechPort } from './speak'

interface FakePort extends SpeechPort {
  spoken: string[]
  cancels: number
  finish(): void
}

function fakePort(): FakePort {
  const pending: Array<() => void> = []
  const port: FakePort = {
    spoken: [],
    cancels: 0,
    speak(text, onDone) {
      port.spoken.push(text)
      pending.push(onDone)
    },
    cancel() {
      port.cancels += 1
    },
    finish() {
      pending.shift()?.()
    },
  }
  return port
}

const LONG =
  'Warning. That reading did not come from row 3. It most likely came from row 2, probability 91%. ' +
  'Please try row 3 again, slowly, keeping the black probe on ground, the red probe flat on the strip, ' +
  'and your other hand on the edge of the board so the probe does not slide into the neighbouring row.'

describe('chunkText', () => {
  it('keeps short text as one chunk', () => {
    expect(chunkText('3.671 volts, accepted.')).toEqual(['3.671 volts, accepted.'])
  })

  it('splits long text into chunks under the limit at sentence or comma boundaries', () => {
    const chunks = chunkText(LONG)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThan(MAX_CHUNK_CHARS)
      expect(chunk).toMatch(/[.,!?;:]$|\w$/)
    }
    expect(chunks.join(' ')).toBe(LONG)
  })

  it('splits a single clause with no punctuation at word boundaries', () => {
    const words = Array.from({ length: 80 }, (_, i) => `word${i}`).join(' ')
    const chunks = chunkText(words)
    for (const chunk of chunks) expect(chunk.length).toBeLessThan(MAX_CHUNK_CHARS)
    expect(chunks.join(' ')).toBe(words)
  })

  it('returns nothing for blank text', () => {
    expect(chunkText('   ')).toEqual([])
  })
})

describe('createSpeaker', () => {
  let port: FakePort

  beforeEach(() => {
    port = fakePort()
    usePrefs.setState({ voiceEnabled: true })
  })

  it('stays silent when speech is off in prefs', () => {
    usePrefs.setState({ voiceEnabled: false })
    const speaker = createSpeaker({ port })
    speaker.unlock()
    speaker.say('Touch the red probe to row 3.')
    expect(port.spoken).toEqual([''])
  })

  it('queues speech until unlock, then primes with an empty utterance and plays the queue', () => {
    const speaker = createSpeaker({ port })
    speaker.say('First.')
    expect(port.spoken).toEqual([])
    speaker.unlock()
    expect(port.spoken).toEqual(['', 'First.'])
  })

  it('chains chunks and polite messages in order, one at a time', () => {
    const speaker = createSpeaker({ port })
    speaker.unlock()
    speaker.say(LONG)
    speaker.say('After.')
    const chunks = chunkText(LONG)
    expect(port.spoken).toEqual(['', chunks[0]])
    port.finish() // the unlock primer
    for (let i = 1; i < chunks.length; i += 1) port.finish()
    port.finish()
    expect(port.spoken).toEqual(['', ...chunks, 'After.'])
  })

  it('assertive speech cancels current speech and drains the polite queue', () => {
    const speaker = createSpeaker({ port })
    speaker.unlock()
    port.finish()
    speaker.say('Polite one.')
    speaker.say('Polite two.')
    speaker.say('Warning.', 'assertive')
    expect(port.cancels).toBe(1)
    expect(port.spoken).toEqual(['', 'Polite one.', 'Warning.'])
    port.finish() // stale callback from the cancelled utterance is ignored
    port.finish()
    expect(port.spoken).toEqual(['', 'Polite one.', 'Warning.'])
    expect(speaker.isSpeaking()).toBe(false)
  })

  it('reports speaking transitions and resolves whenIdle after the queue drains', async () => {
    const speaker = createSpeaker({ port })
    const seen: boolean[] = []
    speaker.subscribe((speaking) => seen.push(speaking))
    speaker.unlock()
    port.finish()
    speaker.say('One.')
    let idle = false
    void speaker.whenIdle().then(() => {
      idle = true
    })
    await Promise.resolve()
    expect(idle).toBe(false)
    port.finish()
    await Promise.resolve()
    expect(idle).toBe(true)
    expect(seen).toEqual([true, false])
  })

  it('whenIdle resolves at once when nothing is playing', async () => {
    const speaker = createSpeaker({ port })
    await expect(speaker.whenIdle()).resolves.toBeUndefined()
  })

  it('cancel stops speech, clears the queue and reports idle', () => {
    const speaker = createSpeaker({ port })
    speaker.unlock()
    port.finish()
    speaker.say('One.')
    speaker.say('Two.')
    speaker.cancel()
    port.finish()
    expect(port.spoken).toEqual(['', 'One.'])
    expect(speaker.isSpeaking()).toBe(false)
  })

  it('drops queued speech if speech is turned off before it plays', () => {
    const speaker = createSpeaker({ port })
    speaker.unlock()
    port.finish()
    speaker.say('One.')
    speaker.say('Two.')
    usePrefs.setState({ voiceEnabled: false })
    port.finish()
    expect(port.spoken).toEqual(['', 'One.'])
    expect(speaker.isSpeaking()).toBe(false)
  })
})

describe('webSpeechPort', () => {
  it('is null where the browser has no speechSynthesis', () => {
    expect(webSpeechPort({} as Window)).toBeNull()
  })

  it('speaks en-US utterances, reports done on end or error, and cancels', () => {
    class FakeUtterance {
      lang = ''
      voice: unknown = null
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor(public text: string) {}
    }
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    const spoken: FakeUtterance[] = []
    const synth = {
      speak: (u: FakeUtterance) => spoken.push(u),
      cancel: vi.fn(),
      getVoices: () => [{ lang: 'en-US', name: 'Test' }],
    }
    try {
      const port = webSpeechPort({ speechSynthesis: synth } as unknown as Window)
      const done = vi.fn()
      port?.speak('Row 3.', done)
      port?.speak('Row 2.', done)
      spoken[0]?.onend?.()
      spoken[1]?.onerror?.()
      port?.cancel()
      expect(spoken.map((u) => [u.text, u.lang])).toEqual([
        ['Row 3.', 'en-US'],
        ['Row 2.', 'en-US'],
      ])
      expect(spoken[0]?.voice).toEqual({ lang: 'en-US', name: 'Test' })
      expect(done).toHaveBeenCalledTimes(2)
      expect(synth.cancel).toHaveBeenCalledOnce()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
