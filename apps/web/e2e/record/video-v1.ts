import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test, type Browser, type Page } from '@playwright/test'
import { recordedFixtureExists, readFixture, isProvisional } from '../helpers/fixture'
import { setTheme } from '../helpers/setTheme'
import { LandingPage } from '../pages/LandingPage'
import { SimPage } from '../pages/SimPage'

// Records the nine shots of docs/VIDEO_STORYBOARD.md, one WebM per shot plus shots.json.
// Not a test: run with `TRUEHAND_RECORD=1 pnpm exec playwright test --project=record`.
// Every selector comes from docs/UI_CONTRACT.md through the page objects.

const OUT_DIR = fileURLToPath(new URL('../../recordings/video-v1/', import.meta.url))
const SIZE = { width: 1920, height: 1080 }
const SCRIPT = 'video-v1'
const SCENE_READY_TIMEOUT_MS = 10_000
const STEP_TIMEOUT_MS = 15_000
/** Fallbacks from storyboard section 3: seconds added to a neighbour when a shot is dropped. */
const UNRESOLVED_FALLBACK_SEC = 5
const THERMOMETER_FALLBACK_SEC = 10

interface ShotPlan {
  n: number
  title: string
  /** Storyboard slot, seconds from the start of the video. */
  slot: [number, number]
  path: string
  run(page: Page, hold: (seconds: number) => Promise<void>): Promise<void>
}

interface ShotRecord {
  shot: number
  title: string
  file: string
  url: string
  storyboard: { start: number; end: number; seconds: number }
  /** Seconds from the start of this shot's WebM; trim to [start, end] when editing. */
  start: number
  end: number
  recordedSeconds: number
  scene: boolean
  notes: string[]
}

function withScript(path: string, n: number): string {
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}script=${SCRIPT}&shot=${n}`
}

async function blur(page: Page): Promise<void> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
}

/** Scene frames from `window.__truehandScene` (UI_CONTRACT section 3), or the text channel. */
async function waitForSceneOrText(page: Page): Promise<boolean> {
  await page.getByRole('heading', { level: 1 }).waitFor()
  try {
    await page.waitForFunction(
      () =>
        ((window as { __truehandScene?: { frames: number } }).__truehandScene?.frames ?? 0) > 0,
      undefined,
      { timeout: SCENE_READY_TIMEOUT_MS },
    )
    return true
  } catch {
    return false
  }
}

async function scrollToSection(page: Page, id: string): Promise<void> {
  await new LandingPage(page)
    .section(id as 'mast')
    .evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), undefined, {
      timeout: STEP_TIMEOUT_MS,
    })
}

function plan(): { shots: ShotPlan[]; notes: string[] } {
  const notes: string[] = []
  const hasUnresolved = recordedFixtureExists('unresolved_pair')
  const hasThermometer = recordedFixtureExists('thermometer_demo')
  const worked = readFixture('worked_example')
  if (worked && isProvisional(worked)) {
    notes.push(
      'worked_example is PROVISIONAL: say "numbers shown are from a provisional fixture" in shot 3.',
    )
  }
  const extend5 = hasUnresolved ? 0 : UNRESOLVED_FALLBACK_SEC
  const extend8 = hasThermometer ? 0 : THERMOMETER_FALLBACK_SEC
  if (!hasUnresolved)
    notes.push('unresolved_pair fixture missing: shot 6 dropped, shot 5 extended 5 s.')
  if (!hasThermometer)
    notes.push('thermometer_demo fixture missing: shot 7 dropped, shot 8 extended 10 s.')

  const shots: ShotPlan[] = [
    {
      n: 1,
      title: 'Landing mast',
      slot: [0, 15],
      path: '/?present=1',
      run: async (_page, hold) => hold(15),
    },
    {
      n: 2,
      title: 'Problem section',
      slot: [15, 35],
      path: '/?present=1',
      run: async (page, hold) => {
        await scrollToSection(page, 'problem')
        await hold(20)
      },
    },
    {
      n: 3,
      title: 'Simulator, first reading',
      slot: [35, 75],
      path: '/sim?demo=worked-example&present=1',
      run: async (page, hold) => {
        const sim = new SimPage(page)
        await blur(page)
        await page.keyboard.press('p')
        await sim.logRows().first().waitFor({ timeout: STEP_TIMEOUT_MS })
        await blur(page)
        await page.keyboard.press('p')
        await hold(40)
      },
    },
    {
      n: 4,
      title: 'Placement warning',
      slot: [75, 90],
      path: '/sim?demo=worked-example&present=1',
      run: async (page, hold) => {
        const sim = new SimPage(page)
        await blur(page)
        await page.keyboard.press(']')
        await sim.warning.waitFor({ timeout: STEP_TIMEOUT_MS })
        await hold(15)
      },
    },
    {
      n: 5,
      title: 'Second reading, diagnosis',
      slot: [90, 105 + extend5],
      path: '/sim?demo=worked-example&present=1',
      run: async (page, hold) => {
        const sim = new SimPage(page)
        await blur(page)
        await page.keyboard.press(']')
        await sim.waitForStep(1)
        await blur(page)
        await page.keyboard.press(']')
        await sim.diagnosis.waitFor({ timeout: STEP_TIMEOUT_MS })
        await hold(15 + extend5)
      },
    },
    ...(hasUnresolved
      ? [
          {
            n: 6,
            title: 'Unresolved pair',
            slot: [105, 120] as [number, number],
            path: '/sim?mode=replay&fixture=unresolved_pair&present=1',
            run: async (page: Page, hold: (s: number) => Promise<void>) => {
              await blur(page)
              await page.keyboard.press('p')
              await new SimPage(page).unresolved.waitFor({ timeout: 4 * STEP_TIMEOUT_MS })
              await hold(15)
            },
          },
        ]
      : []),
    ...(hasThermometer
      ? [
          {
            n: 7,
            title: 'Thermometer (simulated)',
            slot: [120, 140] as [number, number],
            path: '/sim?domain=thermometer&mode=replay&fixture=thermometer_demo&present=1',
            run: async (page: Page, hold: (s: number) => Promise<void>) => {
              await new SimPage(page).badge('SIMULATED').first().waitFor()
              await blur(page)
              await page.keyboard.press('p')
              await hold(20)
            },
          },
        ]
      : []),
    {
      n: 8,
      title: 'Evidence',
      slot: [140, 155 + extend8],
      path: '/evidence?present=1',
      run: async (page, hold) => {
        const pending = new SimPage(page).badge('PENDING').first()
        if ((await pending.count()) > 0) {
          await pending.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }))
        }
        await hold(15 + extend8)
      },
    },
    {
      n: 9,
      title: 'Close',
      slot: [155, 165],
      path: '/?present=1',
      run: async (page, hold) => {
        await scrollToSection(page, 'close')
        await hold(10)
      },
    },
  ]
  return { shots, notes }
}

/** Names the shot in the error so a failed run says which slot to fall back on. */
async function recordShotOrExplain(
  browser: Browser,
  baseURL: string,
  shot: ShotPlan,
): Promise<ShotRecord> {
  try {
    return await recordShot(browser, baseURL, shot)
  } catch (error) {
    const reason = error instanceof Error ? error.message.split('\n')[0] : String(error)
    throw new Error(
      `shot ${shot.n} (${shot.title}) failed: ${reason}. See VIDEO_STORYBOARD.md section 3.`,
    )
  }
}

async function recordShot(browser: Browser, baseURL: string, shot: ShotPlan): Promise<ShotRecord> {
  const context = await browser.newContext({
    baseURL,
    viewport: SIZE,
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    reducedMotion: 'no-preference',
    recordVideo: { dir: `${OUT_DIR}raw`, size: SIZE },
  })
  await setTheme(context, 'dark')
  const page = await context.newPage()
  const videoStart = Date.now()
  const elapsed = () => (Date.now() - videoStart) / 1000
  const url = withScript(shot.path, shot.n)
  const notes: string[] = []

  await page.goto(url)
  const scene = await waitForSceneOrText(page)
  if (!scene) notes.push('no scene frames: recorded the text channel (storyboard fallback).')
  if ((await page.locator('html').getAttribute('data-present')) !== 'true') {
    notes.push('presentation mode not active: header and footer are visible.')
  }

  // The shot's own key presses count toward its length; `hold` waits out the rest of the slot.
  const start = elapsed()
  const hold = async (seconds: number) => {
    await page.waitForTimeout(Math.max(0, (seconds - (elapsed() - start)) * 1000))
  }
  await shot.run(page, hold)
  const end = elapsed()

  const video = page.video()
  await context.close()
  const file = `shot-${shot.n}.webm`
  if (!video) throw new Error(`shot ${shot.n}: no video was recorded`)
  await video.saveAs(`${OUT_DIR}${file}`)
  await video.delete()

  const [slotStart, slotEnd] = shot.slot
  return {
    shot: shot.n,
    title: shot.title,
    file,
    url,
    storyboard: { start: slotStart, end: slotEnd, seconds: slotEnd - slotStart },
    start: round(start),
    end: round(end),
    recordedSeconds: round(end - start),
    scene,
    notes,
  }
}

function round(seconds: number): number {
  return Math.round(seconds * 100) / 100
}

test('video-v1: nine storyboard shots', async ({ browser, baseURL }) => {
  if (!baseURL) throw new Error('baseURL is not set in playwright.config.ts')
  mkdirSync(OUT_DIR, { recursive: true })

  const { shots, notes } = plan()
  for (const note of notes) console.log(`note: ${note}`)
  const records: ShotRecord[] = []
  const recordedAt = new Date().toISOString()
  for (const shot of shots) {
    const r = await recordShotOrExplain(browser, baseURL, shot)
    records.push(r)
    // Rewritten after every shot so a run that fails at shot n keeps shots 1..n-1 usable.
    writeFileSync(
      `${OUT_DIR}shots.json`,
      `${JSON.stringify({ script: SCRIPT, baseURL, recordedAt, size: SIZE, notes, shots: records }, null, 2)}\n`,
    )
    console.log(
      `shot ${r.shot} ${r.title}: ${r.recordedSeconds}s recorded vs ${r.storyboard.seconds}s storyboard` +
        (r.notes.length ? ` (${r.notes.join(' ')})` : ''),
    )
  }
})
