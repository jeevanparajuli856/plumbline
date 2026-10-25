import { needsFullUi } from './helpers/full'
import { expect, test } from './helpers/test'
import { SimPage } from './pages/SimPage'

// Voice is driven by the recognition stub the voice lane installs on `?fakeVoice=1`
// (UI_CONTRACT section 4). Speech synthesis is replaced with a counter so nothing plays aloud.

const STUB_TIMEOUT_MS = 10_000

declare global {
  interface Window {
    __plumblineFakeRecognition?: { say(transcript: string, alternatives?: string[]): void }
    __e2eSpoken?: string[]
  }
}

test.describe('voice loop', () => {
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
    await expect(sim.heading).toContainText('row 3')
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
    expect(await page.evaluate(() => window.__e2eSpoken ?? [])).toEqual([])
  })

  test('V turns speech on and the warning is spoken', async ({ page }) => {
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await page.keyboard.press('v')
    await expect(sim.speech).toHaveAttribute('aria-checked', 'true')
    await sim.next.click()
    await sim.waitForStep(1)
    await expect
      .poll(async () => (await page.evaluate(() => window.__e2eSpoken ?? [])).join(' '))
      .toContain('row 2')
  })

  test('a spoken reading is parsed and submitted through the voice channel', async ({ page }) => {
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await page.keyboard.press('m')
    await expect(sim.listen).toHaveAttribute('aria-pressed', 'true')
    await page.evaluate(() => window.__plumblineFakeRecognition!.say('three point six seven one'))
    await sim.waitForStep(1)
    await expect(sim.logCell(1, 'reading')).toContainText('3.671')
    await expect(sim.warning).toContainText('row 2')
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
