import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import EnvironmentPlugin from "vite-plugin-environment";
import dotenv from "dotenv";
import path from "path";
import { resolve } from 'path';

// Load environment variables from the frontend directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const isDev = process.env["DFX_NETWORK"] !== "ic" && process.env["NODE_ENV"] !== "production";
const isProduction = process.env.NODE_ENV === "production" || process.env["DFX_NETWORK"] === "ic";
const network = process.env["DFX_NETWORK"] || "local";

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      fastRefresh: false // Disable for emergency builds
    }),
    EnvironmentPlugin("all", { prefix: "CANISTER_" }),
    EnvironmentPlugin("all", { prefix: "DFX_" }),
    EnvironmentPlugin("all", { prefix: "VITE_" })
    // NO BigInt transformation in emergency mode
  ],
  esbuild: {
    target: 'es2020',
    keepNames: true,
    minifyIdentifiers: false,
    minifySyntax: false, // Disabled for emergency
    minifyWhitespace: false, // Disabled for emergency
    legalComments: 'none',
    treeShaking: false // Disabled for emergency
  },
  optimizeDeps: {
    // Exclude ALL heavy dependencies
    exclude: [
      '@xenova/transformers', 
      'onnxruntime-web', 
      'tesseract.js', 
      'nsfwjs',
      '@tensorflow/tfjs',
      '@tensorflow/tfjs-backend-wasm',
      '@tensorflow/tfjs-backend-webgl',
      '@dfinity/identity',
      '@dfinity/agent',
      '@dfinity/auth-client',
      '@dfinity/candid',
      '@dfinity/principal'
    ],
    include: ['react', 'react-dom'],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  root: path.join(__dirname),
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 10000, // Very high limit
    target: 'es2020',
    minify: false, // No minification
    cssMinify: false, // No CSS minification
    reportCompressedSize: false,
    emptyOutDir: true,
    rollupOptions: {
      maxParallelFileOps: 1, // Single threaded
      // Minimal external dependencies
      external: [
        '@dfinity/identity',
        '@dfinity/agent',
        '@dfinity/auth-client',
        '@dfinity/candid',
        '@dfinity/principal',
        '@xenova/transformers',
        'onnxruntime-web',
        '@tensorflow/tfjs',
        '@tensorflow/tfjs-backend-wasm',
        '@tensorflow/tfjs-backend-webgl',
        'nsfwjs',
        'tesseract.js'
      ],
      output: {
        // No manual chunking
        manualChunks: undefined,
        // Simplest output format
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  server: {
    port: 3003,
    host: true,
    hmr: {
      overlay: false
    }
  },
  define: {
    __DEV__: isDev,
    __PROD__: isProduction,
    global: 'globalThis',
    'globalThis': 'globalThis', 
    "process.env.CANISTER_ID_BONDED_APP_BACKEND": JSON.stringify(
      isDev
        ? process.env["CANISTER_ID_BONDED_APP_BACKEND"] || "rdmx6-jaaaa-aaaaa-aaadq-cai"
        : process.env["CANISTER_ID_BONDED_APP_BACKEND"]
    ),
    "process.env.CANISTER_ID_BONDED_APP_FRONTEND": JSON.stringify(
      isDev
        ? process.env["CANISTER_ID_BONDED_APP_FRONTEND"] || "rrkah-fqaaa-aaaaa-aaaaq-cai"
        : process.env["CANISTER_ID_BONDED_APP_FRONTEND"]
    ),
    "process.env.DFX_NETWORK": JSON.stringify(network),
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development")
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@services': resolve(__dirname, 'src/services'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@screens': resolve(__dirname, 'src/screens'),
      // Minimal polyfills only
      buffer: 'buffer',
      process: 'process/browser'
    }
  }
});

