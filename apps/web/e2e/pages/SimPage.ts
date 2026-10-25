import { expect, type Locator, type Page } from '@playwright/test'

/** Selectors for `/sim`, exactly as bound in docs/UI_CONTRACT.md section 1. */
export class SimPage {
  readonly heading: Locator
  readonly instruction: Locator
  readonly voltsInput: Locator
  readonly celsiusInput: Locator
  readonly submit: Locator
  readonly warning: Locator
  readonly diagnosis: Locator
  readonly unresolved: Locator
  readonly beliefFigure: Locator
  readonly beliefTable: Locator
  readonly placementStrip: Locator
  readonly readingLog: Locator
  readonly next: Locator
  readonly play: Locator
  readonly pause: Locator
  readonly previous: Locator
  readonly reset: Locator
  readonly modeGroup: Locator
  readonly instrumentGroup: Locator
  readonly speech: Locator
  readonly listen: Locator
  readonly textOnly: Locator
  readonly themeGroup: Locator
  readonly shortcuts: Locator
  readonly apiStatus: Locator
  readonly badges: Locator
  readonly skipLink: Locator
  readonly scene: Locator
  /** Assertive live region from `src/a11y/LiveRegion.tsx` (not in UI_CONTRACT; see e2e/README.md). */
  readonly liveAssertive: Locator
  readonly livePolite: Locator

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1 })
    this.instruction = page.getByTestId('instruction')
    this.voltsInput = page.getByLabel('Meter reading in volts')
    this.celsiusInput = page.getByLabel('Thermometer reading in degrees Celsius')
    this.submit = page.getByRole('button', { name: 'Submit reading' })
    this.warning = page.getByTestId('warning-banner')
    this.diagnosis = page.getByTestId('diagnosis')
    this.unresolved = page.getByTestId('unresolved')
    this.beliefFigure = page.getByRole('figure', { name: 'Belief over faults' })
    this.beliefTable = page.getByRole('table', { name: 'Belief over faults' })
    this.placementStrip = page.getByRole('list', { name: 'Where the probe landed' })
    this.readingLog = page.getByRole('table', { name: 'Reading log' })
    this.next = page.getByRole('button', { name: 'Next recorded reading' })
    this.play = page.getByRole('button', { name: 'Play', exact: true })
    this.pause = page.getByRole('button', { name: 'Pause', exact: true })
    this.previous = page.getByRole('button', { name: 'Previous step' })
    this.reset = page.getByRole('button', { name: 'Reset' })
    this.modeGroup = page.getByRole('radiogroup', { name: 'Mode' })
    this.instrumentGroup = page.getByRole('radiogroup', { name: 'Instrument' })
    this.speech = page.getByRole('switch', { name: 'Speech' })
    this.listen = page.getByRole('button', { name: /Listen/ })
    this.textOnly = page.getByRole('switch', { name: 'Text only' })
    this.themeGroup = page.getByRole('radiogroup', { name: 'Theme' })
    this.shortcuts = page.getByRole('dialog', { name: 'Keyboard shortcuts' })
    this.apiStatus = page.getByTestId('api-status')
    this.badges = page.getByTestId('badge')
    this.skipLink = page.getByRole('link', { name: 'Skip to main content' })
    this.scene = page.getByTestId('scene')
    this.liveAssertive = page.locator('#live-assertive')
    this.livePolite = page.locator('#live-polite')
  }

  async goto(query: Record<string, string> = {}): Promise<void> {
    const search = new URLSearchParams(query).toString()
    await this.page.goto(`/sim${search ? `?${search}` : ''}`)
  }

  /** Body rows only (header cells are `columnheader`, body cells are `cell`). */
  logRows(): Locator {
    return this.readingLog.getByRole('row').filter({ has: this.page.getByRole('cell') })
  }

  /** Column order is fixed by the contract: Step, Told, Reading, Landed, Warning. */
  logCell(step: number, column: 'step' | 'told' | 'reading' | 'landed' | 'warning'): Locator {
    const index = ['step', 'told', 'reading', 'landed', 'warning'].indexOf(column)
    return this.logRows()
      .nth(step - 1)
      .getByRole('cell')
      .nth(index)
  }

  badge(text: 'PROVISIONAL' | 'SIMULATED' | 'PENDING'): Locator {
    return this.badges.filter({ hasText: text })
  }

  /** Types a reading and submits it with the button (the typed channel). */
  async submitReading(input: Locator, value: string): Promise<void> {
    await input.fill(value)
    await this.submit.click()
  }

  /**
   * Waits until step `n` is fully accepted: its log row exists and either the landed row was
   * revealed or the session ended. Pressing `]` or Next during `revealing` is ignored by the
   * store, so stepping without this wait is the main replay race.
   */
  async waitForStep(n: number): Promise<void> {
    await expect(this.logRows()).toHaveCount(n)
    await expect
      .poll(
        async () => {
          if ((await this.diagnosis.count()) > 0 || (await this.unresolved.count()) > 0) return true
          const landed = (await this.logCell(n, 'landed').textContent())?.trim().toLowerCase()
          return Boolean(landed) && landed !== 'hidden'
        },
        { message: `step ${n} never finished its reveal`, timeout: 8_000 },
      )
      .toBe(true)
  }
}
