import type { Locator, Page } from '@playwright/test'

export const LANDING_SECTION_IDS = [
  'mast',
  'research',
  'problem',
  'play',
  'how',
  'generalize',
  'product',
  'ladder',
  'evidence',
  'close',
] as const
export type LandingSectionId = (typeof LANDING_SECTION_IDS)[number]

/** Selectors for `/`, as bound in docs/UI_CONTRACT.md section 2. */
export class LandingPage {
  readonly heading: Locator
  readonly play: Locator
  readonly openSimulator: Locator
  readonly transcript: Locator
  readonly captions: Locator

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1 })
    this.play = page.getByRole('button', { name: 'Play the worked example' })
    // The landing's call to action, scoped to main so banner links (Demo) never match it.
    this.openSimulator = page.getByRole('main').getByRole('link', { name: 'Open the simulator' })
    this.transcript = page.getByRole('list', { name: 'Worked example, step by step' })
    this.captions = page.getByTestId('caption')
  }

  async goto(query = ''): Promise<void> {
    await this.page.goto(`/${query}`)
  }

  /**
   * Turns on the in-page Reduce motion preference the way the switch stores it, then reloads into
   * it. The switch is in the web app toolbar; /accessibility will carry it once the pages lane lands.
   */
  async preferReducedMotion(): Promise<void> {
    await this.page.evaluate(() => localStorage.setItem('truehand.reduceMotion', '1'))
    await this.page.reload()
  }

  section(id: LandingSectionId): Locator {
    return this.page.locator(`section#${id}`)
  }

  /** Scrolls the native document top to bottom in small steps, like a reader with a wheel. */
  async scrollThrough(stepPx = 400): Promise<void> {
    const height = await this.page.evaluate(() => document.documentElement.scrollHeight)
    for (let y = 0; y <= height; y += stepPx) {
      await this.page.mouse.wheel(0, stepPx)
      await this.page.waitForTimeout(50)
    }
  }
}
