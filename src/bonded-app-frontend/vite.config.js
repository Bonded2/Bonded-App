import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import EnvironmentPlugin from "vite-plugin-environment";
// import { VitePWA } from 'vite-plugin-pwa';
import dotenv from "dotenv";
import path from "path";
import { resolve } from 'path';
import { fileURLToPath, URL } from 'url';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

dotenv.config();

const isDev = process.env["DFX_NETWORK"] !== "ic" && process.env["NODE_ENV"] !== "production";
const isProduction = process.env.NODE_ENV === "production" || process.env["DFX_NETWORK"] === "ic";

// Determine the network from process.env["DFX_NETWORK"]
// If it's not defined then we default to local and assume
// we are running the vite development server directly
const network = process.env["DFX_NETWORK"] || "local";

const require = createRequire(import.meta.url);

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic', // Use automatic runtime for better compatibility
      fastRefresh: process.env.NODE_ENV !== 'production'
    }),
    EnvironmentPlugin("all", { prefix: "CANISTER_" }),
    EnvironmentPlugin("all", { prefix: "DFX_" }),
    EnvironmentPlugin("all", { prefix: "VITE_" }),
    // Custom plugin to handle ICP package resolution
    {
      name: 'icp-package-resolver',
      enforce: 'pre',
      resolveId(id) {
        // Handle ICP package imports during development
        if (id.startsWith('@dfinity/')) {
          if (isDev) {
            // In development, redirect to our polyfills
            return resolve(__dirname, 'src/utils/icpPolyfill.js');
          } else {
            // In production, mark as external
            return { id, external: true };
          }
        }
        
        // Handle canister integration service during development
        if (isDev && id.endsWith('canisterIntegration.js')) {
          return resolve(__dirname, 'src/services/canisterIntegration.dev.js');
        }
        
        // Handle API service during development
        if (isDev && id.endsWith('api.js')) {
          return resolve(__dirname, 'src/services/api.dev.js');
        }
        
        return null;
      }
    },
    // NUCLEAR BigInt elimination - apply to ALL files including dependencies
    {
      name: 'ultimate-bigint-elimination',
      enforce: 'pre', // Apply before other transforms
      transform(code, id) {
        // Skip our own BigInt replacement file to avoid circular transformation
        if (id.includes('bigint-replacement.js') || id.includes('bigint-polyfill.js')) {
          return null;
        }
          
        // Skip Noble crypto libraries to prevent syntax errors
        if (id.includes('@noble/curves') || id.includes('@noble/hashes') || id.includes('@noble/')) {
          return null;
        }
        // Apply selective BigInt elimination - preserve CBOR functionality
        if (code.includes('BigInt') || code.includes('bigint')) {
          // Skip CBOR-related files to preserve serialization
          if (id.includes('cbor') || 
              id.includes('serializer') || 
              id.includes('deserializer') ||
              id.includes('SelfDescribeCborSerializer') ||
              id.includes('borc') ||
              id.includes('cbor-web') ||
              id.includes('cbor-') ||
              id.includes('/cbor/') ||
              id.includes('Cbor') ||
              id.includes('CBOR') ||
              code.includes('SelfDescribeCborSerializer') ||
              code.includes('new Decoder') ||
              code.includes('cbor.encode') ||
              code.includes('cbor.decode')) {
            return null; // Don't transform CBOR files
          }
          
          let transformedCode = code
            // Replace all BigInt constructors with safe Number conversion
            .replace(/\bBigInt\s*\(/g, '((value) => { try { return typeof value === "string" ? parseInt(value, 10) || 0 : Number(value) || 0; } catch(e) { return 0; } })(')
            // Replace BigInt type checks
            .replace(/typeof\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*===\s*['""]bigint['"]/g, 'typeof $1 === "number"')
            .replace(/typeof\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*!==\s*['""]bigint['"]/g, 'typeof $1 !== "number"')
            // Replace instanceof checks
            .replace(/([a-zA-Z_$][a-zA-Z0-9_$]*)\s*instanceof\s*BigInt/g, 'typeof $1 === "number"')
            // Replace BigInt literals
            .replace(/\b(\d+)n\b/g, '$1')
            // Replace BigInt.prototype references
            .replace(/BigInt\.prototype/g, 'Number.prototype')
            // Replace BigInt static methods
            .replace(/BigInt\.asIntN\s*\(/g, '((bits, value) => Number(value) || 0)(')
            .replace(/BigInt\.asUintN\s*\(/g, '((bits, value) => Math.abs(Number(value)) || 0)(')
            // Handle more complex BigInt patterns
            .replace(/new\s+BigInt\s*\(/g, '((value) => Number(value) || 0)(')
            // Replace bigint type annotations in TypeScript-like syntax
            .replace(/:\s*bigint\b/g, ': number')
            // Replace bigint in union types
            .replace(/\|\s*bigint\b/g, '| number')
            .replace(/bigint\s*\|/g, 'number |')
            // Handle destructuring with bigint
            .replace(/\{\s*([^}]*)\s*\}\s*:\s*\{[^}]*bigint[^}]*\}/g, (match) => {
              return match.replace(/bigint/g, 'number');
            });
          
          if (transformedCode !== code) {
            console.log(`🔧 [BigInt-Elimination] Fixed: ${id.split('/').pop()}`);
            return {
              code: transformedCode,
              map: null
            };
          }
        }
        return null;
      }
    }
    // Temporarily disable PWA plugin to fix build issues
  ],
  esbuild: {
    // Reduce CPU usage during build
    target: 'es2020',
    keepNames: true,
    minifyIdentifiers: false,
    minifySyntax: isProduction,
    minifyWhitespace: isProduction,
    legalComments: 'none',
    treeShaking: true
  },
  optimizeDeps: {
    // Exclude heavy AI dependencies from pre-bundling to save CPU
    exclude: [
      '@xenova/transformers', 
      'onnxruntime-web', 
      'tesseract.js', 
      'nsfwjs',
      // Exclude ICP packages to avoid resolution issues during development
      '@dfinity/identity',
      '@dfinity/agent',
      '@dfinity/auth-client',
      '@dfinity/candid',
      '@dfinity/principal'
    ],
    include: [
      // Critical dependencies for optimization with BigInt fixes
      ...(isProduction ? [] : [
        'react',
        'react-dom',
        'react-router-dom'
      ])
    ],
    // Apply BigInt transformation during dependency optimization
    esbuildOptions: {
      target: 'es2020'
    }
  },
  root: path.join(__dirname),
  build: {
    outDir: "dist",
    sourcemap: false,
    // Reasonable chunk size limits to prevent CPU overload
    chunkSizeWarningLimit: isProduction ? 1000 : 2000,
    // Optimize for build speed, not ultra-light bundles
    target: 'es2020',
    minify: isProduction ? 'esbuild' : false, // esbuild is much faster than terser
    cssMinify: 'esbuild',
    // CPU-friendly options to prevent laptop overheating
    reportCompressedSize: false, // Disable size analysis to save CPU
    emptyOutDir: true,
    // Limit concurrent workers to prevent CPU overload
    rollupOptions: {
      maxParallelFileOps: 2, // Reduce parallel operations
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
      // Always externalize ICP packages to avoid resolution issues
      external: [
        // ICP packages
        '@dfinity/identity',
        '@dfinity/agent',
        '@dfinity/auth-client',
        '@dfinity/candid',
        '@dfinity/principal',
        // AI libraries (only in production)
        ...(isProduction ? [
          '@xenova/transformers',
          'onnxruntime-web',
          '@noble/curves/bls12-381'
        ] : [])
      ],
      output: {
        // Remove globals configuration - using import maps instead
        // Import maps in HTML handle module resolution automatically
        manualChunks: (id) => {
          // Simplified chunking to reduce build complexity
          if (isProduction) {
            // ICP SDK - keep bundled as it's specific to our app
            if (id.includes('@dfinity/')) {
              return 'icp-sdk';
            }
            // Only separate the largest vendor libraries
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
      // Add CORS headers for local development
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
        // Proxy ICP canister calls for local development
        "/.ic": {
          target: `http://127.0.0.1:4943`,
          changeOrigin: true,
          secure: false,
          ws: true
        }
      }
    }),
    // Handle ICP package imports during development
    fs: {
      allow: ['..']
    }
  },
  define: {
    // Global definitions for environment
    __DEV__: isDev,
    __PROD__: isProduction,
    global: 'globalThis',
    'globalThis': 'globalThis', 
    // Network-specific
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
      // Create aliases for cleaner imports
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@services': resolve(__dirname, 'src/services'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@screens': resolve(__dirname, 'src/screens'),
      // Browser polyfills
      buffer: 'buffer',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      util: 'util',
      process: 'process/browser',
      // BigInt replacement
      'bigint': resolve(__dirname, 'src/bigint-replacement.js'),
      // ICP package aliases to prevent resolution issues
      '@dfinity/identity': '@dfinity/identity',
      '@dfinity/agent': '@dfinity/agent',
      '@dfinity/auth-client': '@dfinity/auth-client',
      '@dfinity/candid': '@dfinity/candid',
      '@dfinity/principal': '@dfinity/principal'
    },
    // Fix polyfill resolution issues
    dedupe: ['globalThis', 'core-js']
  }
});
