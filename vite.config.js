import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Disable PWA during development for debug sessions
    ...(mode !== 'development' ? [
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['habit-icon.svg'],
        manifest: {
          name: 'Better Habits',
          short_name: 'Habits',
          description: 'Track your daily habits and build consistency',
          theme_color: '#3b82f6',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'habit-icon.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'habit-icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg}']
        }
      })
    ] : [])
  ],
  server: {
    headers: {
      // Disable caching for development
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    hmr: {
      clientPort: 5173
    }
  }
}))
