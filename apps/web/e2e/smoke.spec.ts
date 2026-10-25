import { expect, test } from '@playwright/test'

test('landing renders the promise and links to the web app', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Measurement you can trust')
  await expect(page.getByRole('link', { name: 'Open the simulator' })).toBeVisible()
})

test('worked example replays to a resolved diagnosis', async ({ page }) => {
  await page.goto('/sim?demo=worked-example')
  const next = page.getByRole('button', { name: 'Next recorded reading' })
  await next.click()
  // The spoken copy of the warning (UI_CONTRACT section 6, decision 2); no role="alert" is used.
  await expect(page.locator('#live-assertive')).toContainText('did not come from row 3')
  await next.click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('R3 is ten times too small')
})
