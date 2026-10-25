import { fileURLToPath, URL } from 'node:url'
import { defineConfig, searchForWorkspaceRoot } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { spaRouteCopies } from './spaRoutes'

const fixturesDir = fileURLToPath(new URL('../../engine/fixtures', import.meta.url))
const docsDir = fileURLToPath(new URL('../../docs', import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    spaRouteCopies(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/*.png', 'brand/*.svg', 'transcripts/*.json'],
      manifest: {
        name: 'Truehand',
        short_name: 'Truehand',
        description: 'An assistant for blind hands that cannot tell you something it has not measured.',
        start_url: '/sim?mode=replay',
        scope: '/',
        display: 'standalone',
        theme_color: '#F3EDE3',
        background_color: '#F3EDE3',
        lang: 'en',
        dir: 'ltr',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,json}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/v1\//],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@fixtures': fixturesDir,
      '@docs': docsDir,
    },
  },
  server: { fs: { allow: [searchForWorkspaceRoot(process.cwd()), fixturesDir, docsDir] } },
  build: {
    target: 'es2022',
    // No manualChunks: splitting three/R3F by hand pulled React and zustand into that chunk,
    // so it was preloaded on `/`. Rolldown keeps the 3D code inside the lazy SceneRoot chunk.
  },
})
