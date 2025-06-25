import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import EnvironmentPlugin from "vite-plugin-environment";
// import { VitePWA } from 'vite-plugin-pwa';
import dotenv from "dotenv";
import path from "path";
import { resolve } from 'path';

dotenv.config();

const isDev = process.env["DFX_NETWORK"] !== "ic" && process.env["NODE_ENV"] !== "production";
const isProduction = process.env.NODE_ENV === "production" || process.env["DFX_NETWORK"] === "ic";

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
    // Aggressive chunk size warnings for ultra-light production
    chunkSizeWarningLimit: isProduction ? 200 : 1000,
    // Optimize for fastest possible loading
    target: 'es2020',
    minify: 'terser',
    cssMinify: 'esbuild',
    rollupOptions: {
      // AGGRESSIVE: Externalize ALL heavy libraries for production
      external: isProduction ? [
        // AI Libraries (already done)
        'nsfwjs',
        'tesseract.js',
        '@xenova/transformers',
        'onnxruntime-web',
        
        // Heavy utility libraries
        'jspdf',
        'jszip',
        'crypto-js',
        'idb',
        
        // React ecosystem (can be loaded from CDN)
        'react',
        'react-dom',
        'react-router-dom',
        'react-select',
        
        // Polyfills and utilities
        'buffer',
        'crypto-browserify',
        'stream-browserify',
        'core-js',
        
        // Workbox (can be loaded separately)
        'workbox-window'
      ] : [],
      output: {
        // Remove globals configuration - using import maps instead
        // Import maps in HTML handle module resolution automatically
        manualChunks: (id) => {
          // Ultra-aggressive chunking for production
          if (isProduction) {
            // ICP SDK - keep bundled as it's specific to our app
            if (id.includes('@dfinity/')) {
              return 'icp-sdk';
            }
            
            // App-specific services - minimal chunks
            if (id.includes('/services/') && id.includes('.js') && !id.includes('/ai/')) {
              return 'app-services';
            }
            
            // Minimal vendor chunk for non-externalized dependencies
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          } else {
            // Development mode - keep AI models in chunks for easier debugging
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
        drop_console: isProduction,
        drop_debugger: true,
        pure_funcs: isProduction ? ['console.log', 'console.info', 'console.debug', 'console.warn'] : [],
        passes: 3, // More aggressive compression
        unsafe: isProduction, // Enable unsafe optimizations in production
        unsafe_comps: isProduction,
        unsafe_math: isProduction
      },
      mangle: {
        safari10: true,
        toplevel: isProduction // Mangle top-level names in production
      },
      format: {
        comments: false
      }
    }
  },
  optimizeDeps: {
    include: [
      // Only include critical dependencies for optimization
      ...(isProduction ? [] : [
        'react',
        'react-dom',
        'react-router-dom'
      ])
    ],
    exclude: [
      // Exclude ALL heavy dependencies from pre-bundling
      'tesseract.js',
      'nsfwjs',
      '@tensorflow/tfjs',
      '@xenova/transformers',
      'onnxruntime-web',
      'jspdf',
      'jszip',
      'crypto-js',
      'idb',
      'workbox-window',
      ...(isProduction ? [
        'react',
        'react-dom',
        'react-router-dom',
        'react-select'
      ] : [])
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
    'process.env.CANISTER_ID_BONDED_APP_BACKEND': JSON.stringify(process.env.CANISTER_ID_BONDED_APP_BACKEND),
    'process.env.VITE_PRODUCTION_BUILD': JSON.stringify(isProduction)
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
    treeShaking: true,
    minifyIdentifiers: isProduction,
    minifySyntax: isProduction,
    minifyWhitespace: isProduction
  }
});
