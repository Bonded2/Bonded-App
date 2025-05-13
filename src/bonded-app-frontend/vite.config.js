import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from 'vite-plugin-pwa';
import EnvironmentPlugin from "vite-plugin-environment";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const isDev = process.env["DFX_NETWORK"] !== "ic" && process.env["NODE_ENV"] !== "production";

// Determine the network from process.env["DFX_NETWORK"]
// If it's not defined then we default to local and assume
// we are running the vite development server directly
const network = process.env["DFX_NETWORK"] || "local";

export default defineConfig({
  plugins: [
    react(),
    EnvironmentPlugin("all", { prefix: "CANISTER_" }),
    EnvironmentPlugin("all", { prefix: "DFX_" }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Bonded - Relationship Verification',
        short_name: 'Bonded',
        description: 'AI and blockchain-based relationship verification app for visa, residency and citizenship applications',
        theme_color: '#2C4CDF',
        background_color: '#FF704D',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/images/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/images/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['productivity', 'utilities', 'social'],
        screenshots: [
          {
            src: '/images/screenshot-timeline.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide'
          },
          {
            src: '/images/screenshot-mobile.png',
            sizes: '750x1334',
            type: 'image/png',
            form_factor: 'narrow'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          }
        ]
      }
    })
  ],
  root: path.join(__dirname),
  build: {
    outDir: path.join(__dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4943",
        changeOrigin: true,
      },
      "/.well-known/ic-domains": {
        target: "https://icp0.io",
        changeOrigin: true
      }
    },
  },
  resolve: {
    alias: [
      {
        find: "declarations",
        replacement: path.resolve(__dirname, "../declarations"),
      },
    ],
    dedupe: ["@dfinity/agent"],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    'process.env.DFX_NETWORK': JSON.stringify(network),
    global: {},
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
});
