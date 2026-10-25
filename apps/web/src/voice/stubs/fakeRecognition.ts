import { ListenError, type ListenAdapter, type ListenResult } from '../listen'

/** Playwright drives the voice loop through this; installed only by pickListenAdapter's guard. */
export interface FakeRecognitionHandle {
  say(transcript: string, alternatives?: string[]): void
}

declare global {
  interface Window {
    __plumblineFakeRecognition?: FakeRecognitionHandle
  }
}

export function createFakeAdapter(): ListenAdapter & FakeRecognitionHandle {
  let pending: { resolve: (r: ListenResult) => void; reject: (e: ListenError) => void } | null = null
  let held: ListenResult | null = null

  return {
    isSupported: () => true,
    start() {
      if (held) {
        const result = held
        held = null
        return Promise.resolve(result)
      }
      return new Promise<ListenResult>((resolve, reject) => {
        pending = { resolve, reject }
      })
    },
    abort() {
      pending?.reject(new ListenError('aborted'))
      pending = null
    },
    say(transcript, alternatives = []) {
      const result = { alternatives: [transcript, ...alternatives].filter((t) => t.trim() !== '') }
      if (!pending) {
        held = result
        return
      }
      pending.resolve(result)
      pending = null
    },
  }
}

export function installFakeRecognition(win: Window = window): ListenAdapter {
  const fake = createFakeAdapter()
  win.__plumblineFakeRecognition = { say: (transcript, alternatives) => fake.say(transcript, alternatives) }
  return fake
}
