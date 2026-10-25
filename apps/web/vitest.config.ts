import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@fixtures': fileURLToPath(new URL('../../engine/fixtures', import.meta.url)),
      '@docs': fileURLToPath(new URL('../../docs', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/vite-env.d.ts'],
      // Ratchet: Sprint 0 floors. The Sprint 1 integration step raises these to the
      // .claude/rules/testing.md targets (engine 90, state/voice/a11y 80). Never lower them.
      thresholds: {
        'src/engine/**': { lines: 40, statements: 40 },
        'src/state/**': { lines: 55, statements: 55 },
        'src/a11y/**': { lines: 14, statements: 14 },
      },
    },
  },
})
