import { needsFullUi } from './helpers/full'
import { STORY } from './helpers/story'
import { expect, test } from './helpers/test'
import { SimPage } from './pages/SimPage'

// Voice is driven by the recognition stub the voice lane installs on `?fakeVoice=1`
// (UI_CONTRACT section 4). The stub exists only in dev and `--mode test` builds; the webServer in
// playwright.config.ts builds in test mode. Speech synthesis is replaced with a counter so
// nothing plays aloud.

const STUB_TIMEOUT_MS = 10_000
/** Spoken form of the worked example's first reading; the test below pins it to the fixture. */
const SPOKEN_FIRST_READING = 'three point six seven one'

test('the spoken phrase matches the fixture reading', () => {
  expect(STORY.firstReading).toBe('3.671')
})

declare global {
  interface Window {
    __plumblineFakeRecognition?: { say(transcript: string, alternatives?: string[]): void }
    __e2eSpoken?: string[]
  }
}

test.describe('voice loop', () => {
  test.skip(
    Boolean(process.env.PLUMBLINE_E2E_BASE_URL),
    'a deployed production build has no fake recognition stub',
  )
  needsFullUi('voice (fake recognition stub) and the integration step (Listen button, M key)')

  let sim: SimPage
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__e2eSpoken = []
      if (!('speechSynthesis' in window)) return
      window.speechSynthesis.speak = (utterance: SpeechSynthesisUtterance) => {
        window.__e2eSpoken?.push(utterance.text)
        // Async like the real engine; dispatching `end` also runs `onend`.
        setTimeout(() => utterance.dispatchEvent(new Event('end')), 0)
      }
    })
    sim = new SimPage(page)
    await sim.goto({ demo: 'worked-example', fakeVoice: '1' })
    await expect(sim.heading).toContainText(STORY.toldLabel)
    // The stub is installed asynchronously; saying anything before it exists is the voice race.
    await page.waitForFunction(
      () => typeof window.__plumblineFakeRecognition?.say === 'function',
      undefined,
      {
        timeout: STUB_TIMEOUT_MS,
      },
    )
  })

  test('speech is off by default and stays silent through a step', async ({ page }) => {
    await expect(sim.speech).toHaveAttribute('aria-checked', 'false')
    await sim.next.click()
    await sim.waitForStep(1)
    // The iOS unlock may speak one empty utterance on the first gesture; it is silent.
    const spoken = await page.evaluate(() => window.__e2eSpoken ?? [])
    expect(spoken.filter((text) => text.trim() !== '')).toEqual([])
  })

  test('V turns speech on and the warning is spoken', async ({ page }) => {
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await page.keyboard.press('v')
    await expect(sim.speech).toHaveAttribute('aria-checked', 'true')
    await sim.next.click()
    await sim.waitForStep(1)
    await expect
      .poll(async () => (await page.evaluate(() => window.__e2eSpoken ?? [])).join(' '))
      .toContain(STORY.landedLabel)
  })

  test('a spoken reading is parsed and submitted through the voice channel', async ({ page }) => {
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await page.keyboard.press('m')
    await expect(sim.listen).toHaveAttribute('aria-pressed', 'true')
    await page.evaluate(
      (transcript) => window.__plumblineFakeRecognition!.say(transcript),
      SPOKEN_FIRST_READING,
    )
    await sim.waitForStep(1)
    await expect(sim.logCell(1, 'reading')).toContainText(STORY.firstReading)
    await expect(sim.warning).toContainText(STORY.landedLabel)
  })

  test('a phrase said before the mic opens is held until the next listen', async ({ page }) => {
    await page.evaluate(
      (transcript) => window.__plumblineFakeRecognition!.say(transcript),
      SPOKEN_FIRST_READING,
    )
    await expect(sim.logRows()).toHaveCount(0)
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await page.keyboard.press('m')
    // The held phrase completes the listen at once, so the pressed state is too brief to assert.
    await sim.waitForStep(1)
    await expect(sim.logCell(1, 'reading')).toContainText(STORY.firstReading)
  })

  test('a transcript is data: markup is never rendered or evaluated', async ({ page }) => {
    let dialogs = 0
    page.on('dialog', async (d) => {
      dialogs += 1
      await d.dismiss()
    })
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await page.keyboard.press('m')
    await expect(sim.listen).toHaveAttribute('aria-pressed', 'true')
    await page.evaluate(() =>
      window.__plumblineFakeRecognition!.say('<img src=x onerror="alert(1)"> three'),
    )
    await page.waitForTimeout(1_000)
    expect(dialogs).toBe(0)
    await expect(page.locator('img[src="x"]')).toHaveCount(0)
    await expect(sim.logRows()).toHaveCount(0)
  })
})
