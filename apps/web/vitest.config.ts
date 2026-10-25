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
      // Ratchet: the .claude/rules/testing.md targets, raised at the Sprint 1 integration
      // (2026-10-25). Never lower them.
      thresholds: {
        'src/engine/**': { lines: 90, statements: 90 },
        'src/state/**': { lines: 80, statements: 80 },
        'src/voice/**': { lines: 80, statements: 80 },
        'src/a11y/**': { lines: 80, statements: 80 },
      },
    },
  },
})
