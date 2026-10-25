import type { Locator, Page } from '@playwright/test'

/** Home `/` sections (POSITIONING section 2, ADR-0014). */
export const HOME_SECTION_IDS = ['hero', 'problem', 'outcomes', 'proof', 'audience', 'cta'] as const
/** How it works `/how-it-works` sections; the worked example and its controls live in `play`. */
export const HOW_IT_WORKS_SECTION_IDS = ['intro', 'play', 'refusal', 'domains'] as const
export type LandingSectionId =
  (typeof HOME_SECTION_IDS)[number] | (typeof HOW_IT_WORKS_SECTION_IDS)[number]

/** Selectors for the marketing pages, as bound in docs/UI_CONTRACT.md section 2. */
export class LandingPage {
  readonly heading: Locator
  readonly play: Locator
  readonly tryTruehand: Locator
  readonly liveInstrument: Locator
  readonly transcript: Locator
  readonly captions: Locator

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1 })
    this.play = page.getByRole('button', { name: 'Play the worked example' })
    // Home's call to action, scoped to main so banner links (Demo) never match it.
    // The hero's call to action; the CTA band repeats it lower on the page.
    this.tryTruehand = page.getByRole('main').getByRole('link', { name: 'Try Truehand' }).first()
    this.liveInstrument = page.getByRole('group', { name: 'Live instrument' })
    this.transcript = page.getByRole('list', { name: 'Worked example, step by step' })
    this.captions = page.getByTestId('caption')
  }

  async goto(query = ''): Promise<void> {
    await this.page.goto(`/${query}`)
  }

  /** How it works holds the worked example, its Play controls and the transcript. */
  async gotoHowItWorks(query = ''): Promise<void> {
    await this.page.goto(`/how-it-works${query}`)
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
