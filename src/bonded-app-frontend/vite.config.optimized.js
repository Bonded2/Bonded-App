import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import EnvironmentPlugin from "vite-plugin-environment";
import dotenv from "dotenv";
import path from "path";
import { resolve } from 'path';
import { fileURLToPath, URL } from 'url';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

// Load environment variables from the frontend directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const isDev = process.env["DFX_NETWORK"] !== "ic" && process.env["NODE_ENV"] !== "production";
const isProduction = process.env.NODE_ENV === "production" || process.env["DFX_NETWORK"] === "ic";
const isEmergencyBuild = process.env.VITE_BUILD_MODE === "emergency";

// Determine the network from process.env["DFX_NETWORK"]
const network = process.env["DFX_NETWORK"] || "local";

const require = createRequire(import.meta.url);

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      fastRefresh: process.env.NODE_ENV !== 'production'
    }),
    EnvironmentPlugin("all", { prefix: "CANISTER_" }),
    EnvironmentPlugin("all", { prefix: "DFX_" }),
    EnvironmentPlugin("all", { prefix: "VITE_" }),
    // OPTIMIZED BigInt elimination - only process YOUR code, not node_modules
    {
      name: 'optimized-bigint-elimination',
      enforce: 'pre',
      transform(code, id) {
        // CRITICAL: Only process src files, skip node_modules entirely
        if (id.includes('node_modules') || isEmergencyBuild) {
          return null;
        }
        
        // Skip our own BigInt replacement file
        if (id.includes('bigint-replacement.js') || id.includes('bigint-polyfill.js')) {
          return null;
        }
        
        // Only process if file actually contains BigInt
        if (code.includes('BigInt') || code.includes('bigint')) {
          let transformedCode = code
            .replace(/\bBigInt\s*\(/g, 'Number(')
            .replace(/\b(\d+)n\b/g, '$1')
            .replace(/:\s*bigint\b/g, ': number');
          
          if (transformedCode !== code) {
            console.log(`🔧 [Optimized-BigInt] Fixed: ${id.split('/').pop()}`);
            return {
              code: transformedCode,
              map: null
            };
          }
        }
        return null;
      }
    }
  ],
  esbuild: {
    target: 'es2020',
    keepNames: true,
    minifyIdentifiers: false,
    minifySyntax: isProduction && !isEmergencyBuild,
    minifyWhitespace: isProduction && !isEmergencyBuild,
    legalComments: 'none',
    treeShaking: true
  },
  optimizeDeps: {
    // Exclude heavy AI dependencies in emergency mode
    exclude: [
      ...(isEmergencyBuild || process.env.EXCLUDE_AI_MODELS ? [
        '@xenova/transformers', 
        'onnxruntime-web', 
        'tesseract.js', 
        'nsfwjs',
        '@tensorflow/tfjs',
        '@tensorflow/tfjs-backend-wasm',
        '@tensorflow/tfjs-backend-webgl'
      ] : []),
      '@dfinity/identity',
      '@dfinity/agent',
      '@dfinity/auth-client',
      '@dfinity/candid',
      '@dfinity/principal'
    ],
    include: [
      ...(isProduction && !isEmergencyBuild ? [] : [
        'react',
        'react-dom',
        'react-router-dom'
      ])
    ],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  root: path.join(__dirname),
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: isEmergencyBuild ? 5000 : (isProduction ? 1000 : 2000),
    target: 'es2020',
    minify: isEmergencyBuild ? false : (isProduction ? 'esbuild' : false),
    cssMinify: isEmergencyBuild ? false : 'esbuild',
    reportCompressedSize: false,
    emptyOutDir: true,
    rollupOptions: {
      // CRITICAL: Increase parallel ops limits for emergency builds
      maxParallelFileOps: isEmergencyBuild ? 1 : 2,
      // Handle polyfill resolution issues
      plugins: [
        {
          name: 'resolve-polyfill-issues',
          resolveId(id, importer) {
            // Fix the problematic polyfill resolution
            if (id.includes('define-globalThis-property') && id.includes('?commonjs-external')) {
              return { id: 'polyfill-globalThis', external: false };
            }
            if (id.includes('../internals/define-globalThis-property')) {
              return { id: 'polyfill-globalThis', external: false };
            }
            if (id.includes('../internals/globalThis') && id.includes('?commonjs-external')) {
              return { id: 'polyfill-globalThis', external: false };
            }
            if (id.includes('../internals/globalThis')) {
              return { id: 'polyfill-globalThis', external: false };
            }
            // Handle any other core-js internals patterns
            if (id.includes('../internals/') && id.includes('?commonjs-external')) {
              return { id: 'polyfill-globalThis', external: false };
            }
            return null;
          },
          load(id) {
            if (id === 'polyfill-globalThis') {
              return 'export default globalThis;';
            }
            return null;
          }
        }
      ],
      external: [
        '@dfinity/identity',
        '@dfinity/agent',
        '@dfinity/auth-client',
        '@dfinity/candid',
        '@dfinity/principal',
        // Externalize AI libraries in emergency mode
        ...(isEmergencyBuild || process.env.EXCLUDE_AI_MODELS ? [
          '@xenova/transformers',
          'onnxruntime-web',
          '@tensorflow/tfjs',
          '@tensorflow/tfjs-backend-wasm',
          '@tensorflow/tfjs-backend-webgl',
          'nsfwjs',
          'tesseract.js'
        ] : [])
      ],
      output: {
        manualChunks: isEmergencyBuild ? undefined : (id) => {
          if (isProduction) {
            if (id.includes('@dfinity/')) {
              return 'icp-sdk';
            }
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          }
        }
      }
    }
  },
  server: {
    port: 3003,
    host: true,
    hmr: {
      overlay: false
    },
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    ...(isDev && {
      proxy: {
        "/api": {
          target: `http://127.0.0.1:4943`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, "/api"),
        },
        "/.ic": {
          target: `http://127.0.0.1:4943`,
          changeOrigin: true,
          secure: false,
          ws: true
        }
      }
    }),
    fs: {
      allow: ['..']
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
      buffer: 'buffer',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      util: 'util',
      process: 'process/browser',
      'bigint': resolve(__dirname, 'src/bigint-replacement.js'),
      '@dfinity/identity': '@dfinity/identity',
      '@dfinity/agent': '@dfinity/agent',
      '@dfinity/auth-client': '@dfinity/auth-client',
      '@dfinity/candid': '@dfinity/candid',
      '@dfinity/principal': '@dfinity/principal'
    },
    // Fix polyfill resolution issues
    dedupe: ['globalThis', 'core-js', 'define-globalThis-property']
  }
});
