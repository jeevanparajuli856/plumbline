import { test as base } from '@playwright/test'
import { blockApi, type EngineTraffic } from './blockApi'

interface PlumblineFixtures {
  /** Engine requests the page attempted; all are aborted (replay never needs the API). */
  engineTraffic: EngineTraffic
}

/** Base test for every spec: the engine API is unreachable unless a spec unroutes it. */
export const test = base.extend<PlumblineFixtures>({
  engineTraffic: [
    async ({ context }, use) => {
      await use(await blockApi(context))
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'
