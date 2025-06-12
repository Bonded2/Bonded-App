import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import EnvironmentPlugin from "vite-plugin-environment";
// import { VitePWA } from 'vite-plugin-pwa';
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
    react({
      // Use classic runtime to avoid JSX dev runtime issues in production
      jsxRuntime: 'classic'
    }),
    EnvironmentPlugin("all", { prefix: "CANISTER_" }),
    EnvironmentPlugin("all", { prefix: "DFX_" })
    // Temporarily disable PWA plugin to fix build issues
  ],
  root: path.join(__dirname),
  build: {
    outDir: path.join(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      external: [],
      onwarn(warning, warn) {
        // Suppress warnings about CommonJS default exports
        if (warning.code === 'MISSING_EXPORT' && 
            (warning.message.includes('rgbcolor') || 
             warning.message.includes('raf') ||
             warning.message.includes('canvg'))) {
          return;
        }
        warn(warning);
      },
      output: {
        manualChunks: (id) => {
          // More granular TensorFlow chunking to prevent circular dependencies
          if (id.includes('@tensorflow/tfjs-core')) {
            return 'tensorflow-core';
          }
          if (id.includes('@tensorflow/tfjs-backend-webgl')) {
            return 'tensorflow-webgl';
          }
          if (id.includes('@tensorflow/tfjs-backend-cpu')) {
            return 'tensorflow-cpu';
          }
          if (id.includes('@tensorflow/tfjs') && !id.includes('backend') && !id.includes('core')) {
            return 'tensorflow-main';
          }
          if (id.includes('nsfwjs')) {
            return 'nsfwjs';
          }
          if (id.includes('onnxruntime') || id.includes('onnx')) {
            return 'onnxruntime';
          }
          if (id.includes('transformers') || id.includes('@xenova')) {
            return 'transformers';
          }
          if (id.includes('tesseract')) {
            return 'tesseract';
          }
          if (id.includes('jspdf') || id.includes('pdf-lib')) {
            return 'pdf-tools';
          }
          if (id.includes('html2canvas')) {
            return 'html2canvas';
          }
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        chunkFileNames: (chunkInfo) => {
          return '[name]-[hash].js';
        },
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
      defaultIsModuleExports: 'auto',
      exclude: [
        '**/node_modules/core-js/**',
        '**/node_modules/simple-peer/**',
        '**/node_modules/queue-microtask/**',
        '**/node_modules/err-code/**'
      ],
      include: [
        '**/node_modules/@tensorflow/**',
        '**/node_modules/nsfwjs/**',
        '**/node_modules/react/**',
        '**/node_modules/react-dom/**',
        '**/node_modules/react-router/**',
        '**/node_modules/react-router-dom/**',
        '**/node_modules/buffer/**',
        '**/node_modules/long/**',
        '**/node_modules/seedrandom/**',
        '**/node_modules/borc/**',
        '**/node_modules/@dfinity/**',
        '**/node_modules/simple-cbor/**',
        '**/node_modules/hoist-non-react-statics/**',
        '**/node_modules/@emotion/**',
        '**/node_modules/rgbcolor/**',
        '**/node_modules/canvg/**'
      ],
    },
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 2048,
    // Use esbuild with careful settings to prevent variable initialization issues
    minify: 'esbuild',
    esbuild: {
      // Keep names to prevent initialization issues
      keepNames: true,
      // Don't drop console in development
      drop: isDev ? [] : ['console', 'debugger'],
      // Use modern target to avoid transpilation issues
      target: 'es2020',
      // Preserve function and class names to prevent circular dependency issues
      minifyIdentifiers: false,
      minifySyntax: true,
      minifyWhitespace: true,
      // Prevent TDZ (Temporal Dead Zone) issues with let/const hoisting
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
          useDefineForClassFields: false
        }
      }
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    hmr: {
      clientPort: 3000,
      host: 'localhost',
      protocol: 'ws',
    },
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
      {
        find: "buffer",
        replacement: "buffer",
      },
      {
        find: "rgbcolor",
        replacement: path.resolve(__dirname, "src/utils/rgbcolor-wrapper.js"),
      },
      {
        find: "raf",
        replacement: path.resolve(__dirname, "src/utils/raf-wrapper.js"),
      }
    ],
    dedupe: ["@dfinity/agent"],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || (isDev ? 'development' : 'production')),
    'process.env.DFX_NETWORK': JSON.stringify(network),
    global: 'globalThis',
    __DEV__: isDev,
  },
  optimizeDeps: {
    exclude: ['core-js', 'simple-peer'],
    include: [
      '@tensorflow/tfjs-core',
      '@tensorflow/tfjs-backend-webgl', 
      '@tensorflow/tfjs-backend-cpu',
      '@tensorflow/tfjs',
      'nsfwjs',
      'jspdf',
      'buffer',
      'borc',
      '@dfinity/agent',
      '@dfinity/candid',
      '@dfinity/principal',
      'simple-cbor'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      },
      target: 'es2020',
      // Preserve the order of imports and prevent hoisting issues
      keepNames: true,
      minifyIdentifiers: false
    },
    // Force dependency optimization to respect the order
    force: true
  }
});
