import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Version is injected at build time via the VITE_APP_VERSION environment variable.
// - Docker builds: passed as --build-arg VITE_APP_VERSION=x.y.z from build.ps1
// - Local dev: falls back to "dev"
// Access in app code as: __APP_VERSION__

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION ?? 'dev'),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'My Living Garden',
        short_name: 'My Garden',
        description: 'Plan your garden beds, schedule seed starting, track harvests, and watch your garden grow — all offline, all yours.',
        theme_color: '#3a7d44',
        background_color: '#f5f0e8',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        // Precache hashed JS/CSS/images only — NOT html.
        // HTML is served via NetworkFirst so users always get the latest after a deploy.
        globPatterns: ['**/*.{js,css,ico,png,svg,glb,gltf}'],
        // Disable the precache-based navigation fallback — our runtimeCaching handles it.
        navigateFallback: null,
        // Never intercept auth routes — they must reach the server for OAuth to work.
        navigateFallbackDenylist: [/^\/auth\//],
        // Immediately claim all open tabs when a new SW activates.
        clientsClaim: true,
        runtimeCaching: [
          {
            // Navigation requests (page loads) always go to the network first.
            // Falls back to cache only when offline.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 3,
            },
          },
        ],
      }
    })
  ],
  server: {
    port: 3000
  }
})
