import { test } from '@playwright/test'

/**
 * Since the Sprint 1 integration every lane's UI is on main, so all specs run by default
 * (UI_CONTRACT section 6 decision 12). `TRUEHAND_E2E_FULL=0` restores the old lane gating.
 */
export const FULL_UI = process.env.TRUEHAND_E2E_FULL !== '0'

/** Call at the top of a test or describe block; `owner` names the lane whose UI it needs. */
export function needsFullUi(owner: string): void {
  test.fixme(
    !FULL_UI,
    `Needs UI from ${owner}; skipped because TRUEHAND_E2E_FULL=0.`,
  )
}
