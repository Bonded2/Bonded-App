import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import EnvironmentPlugin from "vite-plugin-environment";
import dotenv from "dotenv";
import path from "path";
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const isDev = process.env["DFX_NETWORK"] !== "ic" && process.env["NODE_ENV"] !== "production";
const isProduction = process.env.NODE_ENV === "production" || process.env["DFX_NETWORK"] === "ic";
const network = process.env["DFX_NETWORK"] || "local";

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      fastRefresh: false
    }),
    EnvironmentPlugin("all", { prefix: "CANISTER_" }),
    EnvironmentPlugin("all", { prefix: "DFX_" }),
    EnvironmentPlugin("all", { prefix: "VITE_" })
  ],
  esbuild: {
    target: 'es2020',
    keepNames: true,
    minifyIdentifiers: false,
    minifySyntax: false,
    minifyWhitespace: false,
    legalComments: 'none',
    treeShaking: false
  },
  optimizeDeps: {
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
      '@dfinity/principal',
      'core-js' // Exclude problematic core-js
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
    chunkSizeWarningLimit: 10000,
    target: 'es2020',
    minify: false,
    cssMinify: false,
    reportCompressedSize: false,
    emptyOutDir: true,
    rollupOptions: {
      maxParallelFileOps: 1,
      // Add a comprehensive resolver to handle problematic imports
      plugins: [
        {
          name: 'bypass-problematic-imports',
          resolveId(id, importer) {
            // Completely bypass any core-js internal imports
            if (id.includes('core-js') || 
                id.includes('../internals/') || 
                id.includes('define-globalThis-property') ||
                id.includes('?commonjs-external')) {
              return { id: 'virtual:polyfill-stub', external: false };
            }
            return null;
          },
          load(id) {
            if (id === 'virtual:polyfill-stub') {
              return 'export default {}; export const __esModule = true;';
            }
            return null;
          }
        }
      ],
      external: (id) => {
        // External all AI and ICP dependencies
        return [
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
        ].some(dep => id.includes(dep));
      },
      output: {
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
      // Minimal aliases to avoid polyfill conflicts
      buffer: 'buffer',
      process: 'process/browser'
    }
  }
});

