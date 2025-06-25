import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import EnvironmentPlugin from "vite-plugin-environment";
// import { VitePWA } from 'vite-plugin-pwa';
import dotenv from "dotenv";
import path from "path";
import { resolve } from 'path';

dotenv.config();

const isDev = process.env["DFX_NETWORK"] !== "ic" && process.env["NODE_ENV"] !== "production";

// Determine the network from process.env["DFX_NETWORK"]
// If it's not defined then we default to local and assume
// we are running the vite development server directly
const network = process.env["DFX_NETWORK"] || "local";

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic', // Use automatic runtime for better compatibility
      fastRefresh: process.env.NODE_ENV !== 'production'
    }),
    EnvironmentPlugin("all", { prefix: "CANISTER_" }),
    EnvironmentPlugin("all", { prefix: "DFX_" })
    // Temporarily disable PWA plugin to fix build issues
  ],
  root: path.join(__dirname),
  build: {
    outDir: "dist",
    sourcemap: false,
    // Increase chunk size warnings threshold
    chunkSizeWarningLimit: 1000,
    // Optimize for fastest possible loading
    target: 'es2020',
    minify: 'terser',
    cssMinify: 'esbuild',
    rollupOptions: {
      external: () => false,
      output: {
        manualChunks: (id) => {
          // AI models - separate chunks for lazy loading
          if (id.includes('tesseract.js')) {
            return 'ai-ocr';
          }
          if (id.includes('nsfwjs')) {
            return 'ai-nsfw';
          }
          if (id.includes('@tensorflow/tfjs')) {
            return 'ai-tensorflow';
          }
          
          // Core React libraries - minimal bundle
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-core';
          }
          if (id.includes('react-router')) {
            return 'react-router';
          }
          
          // ICP SDK
          if (id.includes('@dfinity/')) {
            return 'icp-sdk';
          }
          
          // Crypto and polyfills
          if (id.includes('crypto-browserify') || id.includes('stream-browserify') || id.includes('buffer')) {
            return 'polyfills';
          }
          
          // AI services
          if (id.includes('/ai/') && id.includes('.js')) {
            return 'ai-services';
          }
          
          // Other services
          if (id.includes('/services/') && id.includes('.js')) {
            return 'app-services';
          }
          
          // Group other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        
        // ULTRA-SMALL: Minimize chunk names
        chunkFileNames: 'js/[name]-[hash:6].js',
        entryFileNames: 'js/main-[hash:6].js',
        assetFileNames: 'assets/[name]-[hash:6].[ext]'
      }
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom'
    ],
    exclude: [
      'tesseract.js',
      'nsfwjs',
      '@tensorflow/tfjs'
    ]
  },
  server: {
    port: 3000,
    host: true,
    hmr: {
      overlay: false
    },
    ...(isDev && {
      proxy: {
        "/api": {
          target: `http://127.0.0.1:4943`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, "/api"),
        },
      }
    })
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@ai': path.resolve(__dirname, 'src/ai'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      'stream': 'stream-browserify',
      'crypto': 'crypto-browserify',
      'buffer': 'buffer'
    }
  },
  define: {
    global: "globalThis",
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.DFX_NETWORK': JSON.stringify(network),
    'process.env.VITE_DFX_NETWORK': JSON.stringify(network),
    'process.env.CANISTER_ID_BONDED_APP_BACKEND': JSON.stringify(process.env.CANISTER_ID_BONDED_APP_BACKEND)
  },
  worker: {
    format: 'es',
    rollupOptions: {
      output: {
        entryFileNames: 'workers/[name]-[hash].js'
      }
    }
  },
  esbuild: {
    target: 'es2020',
    legalComments: 'none',
    treeShaking: true
  }
});
