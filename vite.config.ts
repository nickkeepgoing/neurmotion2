import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'NeuroMotion AI',
        short_name: 'NeuroMotion',
        description: 'ระบบคัดกรองความเสี่ยงโรคทางระบบประสาทเบื้องต้น',
        lang: 'th',
        theme_color: '#E8762C',
        background_color: '#FFF9F2',
        display: 'standalone',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // MediaPipe wasm/model are fetched from CDNs at runtime; don't precache them.
        globPatterns: ['**/*.{js,css,html,png,svg}'],
      },
    }),
  ],
});
