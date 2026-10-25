import { test } from '@playwright/test'

/**
 * Specs that need UI from the parallel Sprint 1 lanes are `fixme` on a branch without it.
 * `PLUMBLINE_E2E_FULL=1` runs them normally (after integration, or to see what is missing).
 */
export const FULL_UI = process.env.PLUMBLINE_E2E_FULL === '1'

/** Call at the top of a test or describe block; `owner` names the lane whose UI it needs. */
export function needsFullUi(owner: string): void {
  test.fixme(
    !FULL_UI,
    `Needs UI from ${owner}. Run with PLUMBLINE_E2E_FULL=1 after the lanes merge.`,
  )
}
