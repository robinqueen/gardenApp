import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,glb,gltf}']
      }
    })
  ],
  server: {
    port: 3000
  }
})
