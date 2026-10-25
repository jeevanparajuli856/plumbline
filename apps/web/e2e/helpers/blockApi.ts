import type { BrowserContext, Page, Request } from '@playwright/test'

/** Every engine HTTP path (`{API_URL}/v1/...`), whatever the API origin is. */
export const ENGINE_ROUTE = '**/v1/**'

export interface EngineTraffic {
  /** Every request the page made to the engine, including aborted ones. */
  readonly requests: Request[]
}

/**
 * Aborts every engine request, as if the API host were asleep or unreachable. Replay must not
 * need it, and blocking it keeps specs independent of an API another lane may be running on :8000.
 */
export async function blockApi(target: Page | BrowserContext): Promise<EngineTraffic> {
  const requests: Request[] = []
  await target.route(ENGINE_ROUTE, async (route) => {
    requests.push(route.request())
    await route.abort('connectionrefused')
  })
  return { requests }
}
