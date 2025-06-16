// This is a placeholder vite.config.js in the project root
// The actual Vite configuration is in src/bonded-app-frontend/vite.config.js
// This file helps Vercel identify the project as a Vite project

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Disable VitePWA plugin to prevent conflicts with custom service worker
// import VitePWA from 'vite-plugin-pwa';

export default defineConfig({
  // This empty config defers to the one in the frontend directory
  // All build processes should target src/bonded-app-frontend
  plugins: [
    react(),
    // VitePWA disabled - using custom service worker registration in frontend config
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   devOptions: {
    //     enabled: true
    //   },
    //   workbox: {
    //     globPatterns: ['**/*.{js,css,html,ico,png,svg,json,vue,txt,woff2}'],
    //     // Exclude large AI model files from precaching
    //     exclude: [
    //       /tensorflow-.*\.js$/,
    //       /nsfwjs-.*\.js$/,
    //       /onnxruntime-.*\.js$/,
    //       /transformers-.*\.js$/,
    //       /tesseract-.*\.js$/,
    //       /pdf-tools-.*\.js$/,
    //     ],
    //     runtimeCaching: [
    //       // Cache AI models with NetworkFirst strategy instead of precaching
    //       {
    //         urlPattern: /(tensorflow|nsfwjs|onnxruntime|transformers|tesseract|pdf-tools)-.*\.js$/,
    //         handler: 'NetworkFirst',
    //         options: {
    //           cacheName: 'ai-models',
    //           expiration: {
    //             maxEntries: 10,
    //             maxAgeSeconds: 24 * 60 * 60 * 7 // 7 days
    //           }
    //         }
    //       },
    //       // Cache other assets
    //       {
    //         urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
    //         handler: 'CacheFirst',
    //         options: {
    //           cacheName: 'google-fonts-cache',
    //           expiration: {
    //             maxEntries: 10,
    //             maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
    //           },
    //           cacheKeyWillBeUsed: async ({ request }) => {
    //             return `${request.url}?${Math.round(Date.now() / (1000 * 60 * 60 * 24))}`
    //           }
    //         }
    //       }
    //     ]
    //   },
    //   includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'safari-pinned-tab.svg'],
    //   manifest: {
    //     name: 'Bonded',
    //     short_name: 'Bonded',
    //     description: 'Relationship verification app',
    //     theme_color: '#ffffff',
    //     icons: [
    //       {
    //         src: 'pwa-192x192.png',
    //         sizes: '192x192',
    //         type: 'image/png'
    //       },
    //       {
    //         src: 'pwa-512x512.png',
    //         sizes: '512x512',
    //         type: 'image/png'
    //       }
    //     ]
    //   }
    // })
  ],
}); 