import { afterEach, describe, expect, it, vi } from 'vitest'
import { createWebAdapter } from './adapters/web'
import { DEFAULT_LISTEN_OPTIONS, fakeVoiceAllowed, ListenError, pickListenAdapter } from './listen'
import { createFakeAdapter, installFakeRecognition } from './stubs/fakeRecognition'

class FakeRecognition {
  static instances: FakeRecognition[] = []
  lang = ''
  continuous = true
  interimResults = true
  maxAlternatives = 1
  onresult: ((event: unknown) => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  onspeechend: (() => void) | null = null
  start = vi.fn()
  abort = vi.fn(() => {
    this.onerror?.({ error: 'aborted' })
    this.onend?.()
  })
  constructor() {
    FakeRecognition.instances.push(this)
  }
  emitResult(alternatives: string[]) {
    const result = Object.assign(
      alternatives.map((transcript) => ({ transcript, confidence: 0.9 })),
      { isFinal: true },
    )
    this.onresult?.({ results: [result] })
    this.onend?.()
  }
}

const recognitionWindow = (key: 'SpeechRecognition' | 'webkitSpeechRecognition') =>
  ({
    [key]: FakeRecognition,
    setTimeout: vi.fn((fn: () => void, ms: number) => globalThis.setTimeout(fn, ms)),
    clearTimeout: vi.fn((id: number) => globalThis.clearTimeout(id)),
  }) as unknown as Window

function latest(): FakeRecognition {
  const instance = FakeRecognition.instances[FakeRecognition.instances.length - 1]
  if (!instance) throw new Error('no recognition instance')
  return instance
}

afterEach(() => {
  FakeRecognition.instances = []
  vi.useRealTimers()
})

describe('web recognition adapter', () => {
  it('is unsupported without SpeechRecognition and rejects start', async () => {
    const adapter = createWebAdapter({} as Window)
    expect(adapter.isSupported()).toBe(false)
    await expect(adapter.start(DEFAULT_LISTEN_OPTIONS)).rejects.toMatchObject({ code: 'unsupported' })
  })

  it.each(['SpeechRecognition', 'webkitSpeechRecognition'] as const)('uses %s when present', (key) => {
    expect(createWebAdapter(recognitionWindow(key)).isSupported()).toBe(true)
  })

  it('configures one final result with three alternatives and resolves the transcripts', async () => {
    const adapter = createWebAdapter(recognitionWindow('webkitSpeechRecognition'))
    const pending = adapter.start(DEFAULT_LISTEN_OPTIONS)
    const rec = latest()
    expect(rec).toMatchObject({ lang: 'en-US', continuous: false, interimResults: false, maxAlternatives: 3 })
    expect(rec.start).toHaveBeenCalledOnce()
    rec.emitResult([' three point six seven one ', '3.671', ''])
    await expect(pending).resolves.toEqual({ alternatives: ['three point six seven one', '3.671'] })
  })

  it('maps recognition errors to ListenError codes', async () => {
    const adapter = createWebAdapter(recognitionWindow('SpeechRecognition'))
    const denied = adapter.start(DEFAULT_LISTEN_OPTIONS)
    latest().onerror?.({ error: 'not-allowed' })
    await expect(denied).rejects.toEqual(new ListenError('not-allowed'))
    const odd = adapter.start(DEFAULT_LISTEN_OPTIONS)
    latest().onerror?.({ error: 'bad-grammar' })
    await expect(odd).rejects.toMatchObject({ code: 'other' })
  })

  it('treats an end without a result as no speech', async () => {
    const adapter = createWebAdapter(recognitionWindow('SpeechRecognition'))
    const pending = adapter.start(DEFAULT_LISTEN_OPTIONS)
    latest().onend?.()
    await expect(pending).rejects.toMatchObject({ code: 'no-speech' })
  })

  it('reports the end of audio so the loop can say it is working', () => {
    const adapter = createWebAdapter(recognitionWindow('SpeechRecognition'))
    const onAudioEnd = vi.fn()
    void adapter.start({ ...DEFAULT_LISTEN_OPTIONS, onAudioEnd }).catch(() => {})
    latest().onspeechend?.()
    expect(onAudioEnd).toHaveBeenCalledOnce()
  })

  it('gives up after the timeout with no speech and aborts recognition', async () => {
    vi.useFakeTimers()
    const win = recognitionWindow('SpeechRecognition')
    const adapter = createWebAdapter(win)
    const pending = adapter.start({ ...DEFAULT_LISTEN_OPTIONS, timeoutMs: 1000 })
    const settled = pending.catch((error: unknown) => error)
    vi.advanceTimersByTime(1000)
    expect(await settled).toMatchObject({ code: 'no-speech' })
    expect(latest().abort).toHaveBeenCalled()
    expect(win.setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000)
    expect(win.clearTimeout).toHaveBeenCalled()
  })

  it('abort rejects the pending listen as aborted', async () => {
    const adapter = createWebAdapter(recognitionWindow('SpeechRecognition'))
    const pending = adapter.start(DEFAULT_LISTEN_OPTIONS)
    adapter.abort()
    await expect(pending).rejects.toMatchObject({ code: 'aborted' })
  })

  it('a new start aborts the previous recognition', async () => {
    const adapter = createWebAdapter(recognitionWindow('SpeechRecognition'))
    const first = adapter.start(DEFAULT_LISTEN_OPTIONS)
    const firstRec = latest()
    void adapter.start(DEFAULT_LISTEN_OPTIONS).catch(() => {})
    expect(firstRec.abort).toHaveBeenCalled()
    await expect(first).rejects.toMatchObject({ code: 'aborted' })
  })
})

describe('fake recognition for Playwright', () => {
  it('resolves a pending listen with the transcript first, then the alternatives', async () => {
    const fake = createFakeAdapter()
    expect(fake.isSupported()).toBe(true)
    const pending = fake.start(DEFAULT_LISTEN_OPTIONS)
    fake.say('three point six seven one', ['3.671'])
    await expect(pending).resolves.toEqual({ alternatives: ['three point six seven one', '3.671'] })
  })

  it('a second start rejects the first pending listen as aborted', async () => {
    const fake = createFakeAdapter()
    const first = fake.start(DEFAULT_LISTEN_OPTIONS)
    const second = fake.start(DEFAULT_LISTEN_OPTIONS)
    await expect(first).rejects.toMatchObject({ code: 'aborted' })
    fake.say('nine')
    await expect(second).resolves.toEqual({ alternatives: ['nine'] })
  })

  it('holds a transcript said before listening for the next listen', async () => {
    const fake = createFakeAdapter()
    fake.say('0.338')
    await expect(fake.start(DEFAULT_LISTEN_OPTIONS)).resolves.toEqual({ alternatives: ['0.338'] })
  })

  it('abort rejects the pending listen as aborted', async () => {
    const fake = createFakeAdapter()
    const pending = fake.start(DEFAULT_LISTEN_OPTIONS)
    fake.abort()
    await expect(pending).rejects.toMatchObject({ code: 'aborted' })
  })

  it('installs window.__truehandFakeRecognition with say()', async () => {
    const adapter = installFakeRecognition(window)
    const pending = adapter.start(DEFAULT_LISTEN_OPTIONS)
    window.__truehandFakeRecognition?.say('nine')
    await expect(pending).resolves.toEqual({ alternatives: ['nine'] })
    delete window.__truehandFakeRecognition
  })
})

describe('adapter choice', () => {
  it.each([
    ['?fakeVoice=1', { DEV: true, MODE: 'development' }, true],
    ['?mode=replay&fakeVoice=1', { DEV: false, MODE: 'test' }, true],
    ['?fakeVoice=1', { DEV: false, MODE: 'production' }, false],
    ['', { DEV: true, MODE: 'development' }, false],
    ['?fakeVoice=0', { DEV: true, MODE: 'development' }, false],
  ])('fake voice allowed for %j in %o is %s', (search, env, allowed) => {
    expect(fakeVoiceAllowed(search, env)).toBe(allowed)
  })

  it('picks and installs the fake only when allowed', () => {
    const fakeWindow = { location: { search: '?fakeVoice=1' } } as unknown as Window
    expect(pickListenAdapter(fakeWindow, { DEV: true, MODE: 'development' }).isSupported()).toBe(true)
    expect(fakeWindow.__truehandFakeRecognition).toBeDefined()
    const prodWindow = { location: { search: '?fakeVoice=1' } } as unknown as Window
    expect(pickListenAdapter(prodWindow, { DEV: false, MODE: 'production' }).isSupported()).toBe(false)
    expect(prodWindow.__truehandFakeRecognition).toBeUndefined()
  })
})
