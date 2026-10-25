import { defineConfig, devices, type Project } from '@playwright/test'

// Deterministic server: a `--mode test` production build served by `vite preview`. It is the
// bundle Render publishes plus the dev-and-test-only hooks (the voice stub on `?fakeVoice=1`,
// `window.__plumblineScene`). The dev server is not used because the service worker (offline
// replay) only exists in a build, and HMR and on-demand transforms add timing noise.
const PORT = Number(process.env.PLUMBLINE_E2E_PORT ?? 4173)
const EXTERNAL_BASE_URL = process.env.PLUMBLINE_E2E_BASE_URL
const BASE_URL = EXTERNAL_BASE_URL ?? `http://localhost:${PORT}`
const IS_CI = Boolean(process.env.CI)

// 1280x800 at dpr 1 for every test and screenshot; the video uses its own 1920x1080 project.
const TEST_VIEWPORT = { width: 1280, height: 800 }
const VIDEO_SIZE = { width: 1920, height: 1080 }

const REDUCED_MOTION_SPECS = [
  /worked-example\.spec\.ts/,
  /slip-warning\.spec\.ts/,
  /landing\.spec\.ts/,
]
const WEBKIT_SPECS = [
  /a11y\.spec\.ts/,
  /keyboard-only\.spec\.ts/,
  /worked-example\.spec\.ts/,
  /smoke\.spec\.ts/,
]

// The record project writes video on every run, so it only exists when asked for.
const recordProject: Project = {
  name: 'record',
  testDir: './e2e/record',
  testMatch: /video-v1\.ts$/,
  testIgnore: [],
  retries: 0,
  timeout: 15 * 60_000,
  use: {
    ...devices['Desktop Chrome'],
    viewport: VIDEO_SIZE,
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    reducedMotion: 'no-preference',
    trace: 'off',
    // A missing contract element must fail the shot quickly, not hold for the 15 minute budget.
    actionTimeout: 15_000,
  },
}

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/record/**', '**/pages/**', '**/helpers/**'],
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 1 : 0,
  reporter: IS_CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: TEST_VIEWPORT,
    deviceScaleFactor: 1,
    // A service worker left from an earlier page could serve a stale build; only the offline
    // spec allows one.
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: TEST_VIEWPORT, deviceScaleFactor: 1 },
    },
    {
      name: 'chromium-reduced-motion',
      testMatch: REDUCED_MOTION_SPECS,
      use: {
        ...devices['Desktop Chrome'],
        viewport: TEST_VIEWPORT,
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
      },
    },
    {
      name: 'webkit',
      testMatch: WEBKIT_SPECS,
      use: { ...devices['Desktop Safari'], viewport: TEST_VIEWPORT, deviceScaleFactor: 1 },
    },
    ...(process.env.PLUMBLINE_RECORD === '1' ? [recordProject] : []),
  ],
  webServer: EXTERNAL_BASE_URL
    ? undefined
    : {
        command: `pnpm exec tsc -b && pnpm exec vite build --mode test && pnpm exec vite preview --port ${PORT} --strictPort`,
        url: BASE_URL,
        // Parallel worktrees can each run a preview; reusing a server by port could test another
        // lane's code, so reuse is opt-in.
        reuseExistingServer: process.env.PLUMBLINE_E2E_REUSE === '1',
        timeout: 180_000,
        env: { VITE_PREVIEW_GATE: '0' },
      },
})
