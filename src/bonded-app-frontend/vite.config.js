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
      // Use classic runtime to avoid jsxDEV issues in production builds
      jsxRuntime: 'classic',
      // Ensure React refresh works properly in development only
      fastRefresh: process.env.NODE_ENV !== 'production',
      // Import React explicitly for classic runtime
      jsxImportSource: 'react'
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
      external: [
        // Completely exclude core AI libraries from bundling
        '@tensorflow/tfjs',
        '@tensorflow/tfjs-core',
        '@tensorflow/tfjs-backend-cpu',
        '@tensorflow/tfjs-backend-webgl',
        'nsfwjs',
        'onnxruntime-web',
        'onnxruntime',
        'tesseract.js',
        '@xenova/transformers'
        // Note: All AI libraries loaded via CDN or on-demand
      ],
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
          // Only chunk non-external libraries
          if (id.includes('jspdf') || id.includes('pdf-lib')) {
            return 'pdf-tools';
          }
          if (id.includes('html2canvas')) {
            return 'html2canvas';
          }
          // Keep React and React DOM together with hook utilities to ensure proper loading order
          if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler') || 
              id.includes('use-isomorphic-layout-effect') || id.includes('use-sync-external-store') ||
              id.includes('use-callback-ref') || id.includes('use-composed-ref')) {
            return 'react-vendor';
          }
          if (id.includes('react-router')) {
            return 'react-router-vendor';
          }
                  // Note: Emotion chunking removed since react-select replaced
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
      defaultIsModuleExports: false, // Prevent constructor export issues
      // More conservative transformation to prevent constructor issues
      strictRequires: true,
      exclude: [
        '**/node_modules/core-js/**',
        '**/node_modules/simple-peer/**',
        '**/node_modules/queue-microtask/**',
        '**/node_modules/err-code/**',
        // Exclude libraries known to have constructor issues
        '**/node_modules/crypto-js/**',
        '**/node_modules/jszip/**',
        '**/node_modules/jspdf/**',
        '**/node_modules/bignumber.js/**',
        '**/node_modules/bn.js/**',
        '**/node_modules/big.js/**',
        // Exclude other CBOR libraries that might have issues (but keep borc/simple-cbor for dfinity)
        '**/node_modules/cbor/**',
        '**/node_modules/cbor-js/**'
      ],
      include: [
        '**/node_modules/react/**',
        '**/node_modules/react-dom/**',
        '**/node_modules/react-router/**',
        '**/node_modules/react-router-dom/**',
        '**/node_modules/scheduler/**',
        '**/node_modules/react-is/**',
        '**/node_modules/prop-types/**',
        // Hook utilities that need React to be available
        '**/node_modules/use-isomorphic-layout-effect/**',
        '**/node_modules/use-sync-external-store/**',
        '**/node_modules/use-callback-ref/**',
        '**/node_modules/use-composed-ref/**',
              // Note: Emotion packages removed since react-select replaced
        '**/node_modules/buffer/**',
        '**/node_modules/long/**',
        '**/node_modules/seedrandom/**',
        '**/node_modules/borc/**',
        '**/node_modules/@dfinity/**',
        '**/node_modules/simple-cbor/**',
        '**/node_modules/hoist-non-react-statics/**',
        '**/node_modules/rgbcolor/**',
        '**/node_modules/canvg/**'
      ],
    },
    target: 'es2020',
    sourcemap: true, // Enable source maps for debugging
    chunkSizeWarningLimit: 2048,
    // Use esbuild minification - react-select (Emotion) dependency removed
    minify: 'esbuild',
    // Terser options are now unused since we switched to esbuild
    // but kept for reference in case we need to switch back
    /*
    terserOptions: {
      compress: {
        // Disable all transformations that could break constructors
        keep_classnames: true,
        keep_fnames: true,
        // Prevent constructor-breaking optimizations
        collapse_vars: false,
        reduce_vars: false,
        inline: false,
        sequences: false,
        // Keep all function expressions intact
        keep_fargs: true,
        // Don't optimize property access that might break constructors
        properties: false,
        // Don't transform typeof checks
        typeofs: false,
        // Don't optimize conditionals that might affect constructors
        conditionals: false,
        // Don't optimize comparisons
        comparisons: false,
        // Don't optimize boolean contexts
        booleans: false,
        // Don't optimize loops
        loops: false,
        // Don't remove unused code that might be constructors
        unused: false,
        // Don't optimize if statements
        if_return: false,
        // Don't optimize switch statements
        switches: false,
        // Additional protections for CBOR/BigNumber issues
        hoist_funs: false,
        hoist_vars: false,
        keep_infinity: true,
        side_effects: false,
        // Additional protections for TensorFlow.js variable hoisting issues
        toplevel: false,
        pure_getters: false,
        pure_funcs: [],
        // Don't evaluate constant expressions that might break constructors
        evaluate: false,
        // Don't merge consecutive var declarations
        join_vars: false,
        // Don't optimize comparisons that might affect initialization order
        negate_iife: false,
        // Keep all arrow functions as-is
        arrows: false,
        // Don't optimize passes/assignments
        passes: 1,
        // Additional protection for React initialization order
        dead_code: false,
        drop_console: false,
        drop_debugger: false,
        global_defs: {},
        // Don't remove or modify any imports/exports
        pure_new: false
      },
      mangle: {
        // Completely disable all mangling
        keep_classnames: true,
        keep_fnames: true,
        // Don't mangle any properties
        properties: false,
        // Reserved words that should never be mangled
        reserved: [
          'BigNumber', 'Bignumber', 'bignumber', 'BIGNUMBER',
          'BigNum', 'Bignum', 'bignum', 'BIGNUM',
          'Buffer', 'TextEncoder', 'TextDecoder',
          'Uint8Array', 'ArrayBuffer', 'DataView',
          'Promise', 'Error', 'TypeError', 'ReferenceError',
          'Map', 'Set', 'WeakMap', 'WeakSet',
          'Date', 'RegExp', 'JSON', 'Math',
          'Number', 'String', 'Boolean', 'Object', 'Array',
          'Function', 'Symbol', 'Proxy', 'Reflect',
          'WebAssembly', 'Worker', 'SharedArrayBuffer',
          'Atomics', 'BigInt', 'BigUint64Array', 'BigInt64Array',
          // Crypto-related constructors
          'CryptoKey', 'SubtleCrypto', 'Crypto',
          // Web API constructors
          'Request', 'Response', 'Headers', 'URL', 'URLSearchParams',
          'FormData', 'File', 'Blob', 'FileReader',
          'XMLHttpRequest', 'fetch', 'WebSocket',
          // Canvas and graphics
          'ImageData', 'CanvasRenderingContext2D', 'OffscreenCanvas',
          // React and React DOM comprehensive constructor protection
          'Component', 'PureComponent', 'createElement', 'createContext', 'createRef',
          'forwardRef', 'memo', 'lazy', 'Suspense', 'Fragment', 'StrictMode',
          'Profiler', 'createPortal', 'flushSync', 'hydrate', 'render', 'unmountComponentAtNode',
          'findDOMNode', 'createRoot', 'hydrateRoot', 'ReactDOM', 'ReactDOMClient',
          'React', 'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback',
          'useMemo', 'useRef', 'useImperativeHandle', 'useLayoutEffect', 'useDebugValue',
          'useDeferredValue', 'useId', 'useInsertionEffect', 'useSyncExternalStore',
          'useTransition', 'startTransition', 'act', 'Scheduler', 'unstable_scheduleCallback',
          // React internal constructors that get mangled
          'ReactElement', 'ReactNode', 'ReactFragment', 'ReactPortal', 'ReactClass',
          'ReactComponentClass', 'ReactFunctionComponent', 'ReactElement', 'JSXElement',
          'FiberNode', 'FiberRoot', 'ReactFiber', 'ReactContext', 'ReactProvider',
          'ReactConsumer', 'ReactRef', 'ReactRefObject', 'ReactCurrentOwner',
          'ReactCurrentDispatcher', 'ReactCurrentBatchConfig', 'ReactDebugCurrentFrame',
          // Common library constructors
          'EventEmitter', 'Stream', 'Readable', 'Writable',
          // AI/ML related
          'InferenceSession', 'Tensor', 'Model',
          // BigNumber and math libraries (common source of constructor errors)
          'BN', 'bn', 'Big', 'big', 'Decimal', 'decimal',
          'Long', 'long', 'Int64', 'UInt64',
          // Crypto libraries
          'AES', 'SHA1', 'SHA256', 'SHA512', 'MD5', 'HMAC',
          'PBKDF2', 'Cipher', 'Decipher', 'Hash', 'Sign', 'Verify',
          // PDF and document libraries
          'jsPDF', 'PDFDocument', 'PDFPage', 'PDFFont',
          'JSZip', 'ZipFile', 'ZipEntry',
          // Canvas and image processing
          'Canvas', 'CanvasGradient', 'CanvasPattern',
          'Image', 'ImageBitmap', 'createImageBitmap',
          // TensorFlow.js specific constructors that get minified incorrectly
          'Tensor', 'TensorBuffer', 'Environment', 'Engine',
          'Backend', 'KernelBackend', 'DataStorage',
          'Variable', 'Model', 'LayersModel', 'Sequential',
          'GraphModel', 'InputLayer', 'Dense', 'Conv2D',
          'MaxPooling2D', 'Flatten', 'Dropout', 'Activation',
          'BatchNormalization', 'Concatenate', 'Add',
          // TensorFlow.js backend constructors
          'WebGLBackend', 'CPUBackend', 'NodeJSKernelBackend',
          'MathBackendWebGL', 'MathBackendCPU',
          // TensorFlow.js tensor operations that use constructors
          'TensorInfo', 'NamedTensorMap', 'TensorLike',
          'Shape', 'Rank', 'DataType', 'NumericDataType',
          // Web Workers and threading
          'Worker', 'SharedWorker', 'ServiceWorker',
          'MessageChannel', 'MessagePort', 'BroadcastChannel',
          // Streams and buffers
          'ReadableStream', 'WritableStream', 'TransformStream',
          'ReadableStreamDefaultReader', 'WritableStreamDefaultWriter',
          // IndexedDB and storage
          'IDBDatabase', 'IDBTransaction', 'IDBObjectStore', 'IDBIndex',
          'IDBRequest', 'IDBCursor', 'IDBKeyRange',
          // WebRTC and networking
          'RTCPeerConnection', 'RTCDataChannel', 'RTCSessionDescription',
          'RTCIceCandidate', 'MediaStream', 'MediaStreamTrack',
          // Common library constructors that often get mangled
          'EventTarget', 'CustomEvent', 'AbortController', 'AbortSignal',
          'MutationObserver', 'IntersectionObserver', 'ResizeObserver',
          // Dfinity/ICP specific
          'Principal', 'Agent', 'Actor', 'Identity', 'Delegation',
          'Certificate', 'Cbor', 'Candid',
          // CBOR and encoding related constructors
          'Encoder', 'Decoder', 'Tagged', 'Simple', 'Float',
          'encode', 'decode', 'encodeCanonical', 'decodeFirst',
          'constants', 'utils', 'diagnose'
        ]
      },
      // Don't change any formatting
      format: {
        comments: true,
        beautify: false
      }
    },
    */
    esbuild: {
      // Keep names for debugging and TensorFlow.js compatibility
      keepNames: true,
      // Use modern target
      target: 'es2020',
      // Normal minification - Emotion issues resolved by removing react-select
      minifyIdentifiers: true,
      minifySyntax: true,  // Re-enabled since Emotion is gone
      minifyWhitespace: true,
      // Preserve constructor behavior for AI libraries
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
          useDefineForClassFields: false,
          target: 'ES2020',
          module: 'ESNext',
          moduleResolution: 'node'
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
      },
      {
        find: "bignumber.js",
        replacement: path.resolve(__dirname, "src/utils/bignumber-polyfill.js"),
      }
    ],
    dedupe: ["@dfinity/agent", "react", "react-dom"],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || (isDev ? 'development' : 'production')),
    'process.env.DFX_NETWORK': JSON.stringify(network),
    // EmailJS Configuration - Replace with your actual credentials
    'import.meta.env.VITE_EMAILJS_SERVICE_ID': JSON.stringify(process.env.VITE_EMAILJS_SERVICE_ID || 'service_n2rlbye'),
    'import.meta.env.VITE_EMAILJS_TEMPLATE_ID': JSON.stringify(process.env.VITE_EMAILJS_TEMPLATE_ID || 'template_9qqunmm'),
    'import.meta.env.VITE_EMAILJS_PUBLIC_KEY': JSON.stringify(process.env.VITE_EMAILJS_PUBLIC_KEY || '2C_y5Y8A7moWYpk96'),
    global: 'globalThis',
    __DEV__: isDev,
  },
  optimizeDeps: {
          exclude: [
        'core-js', 
        'simple-peer',
        // Exclude core AI libraries from optimization to prevent initialization issues
        '@tensorflow/tfjs',
        '@tensorflow/tfjs-core',
        '@tensorflow/tfjs-backend-cpu',
        '@tensorflow/tfjs-backend-webgl',
        'nsfwjs',
        'onnxruntime-web',
        'onnxruntime',
        'tesseract.js',
        '@xenova/transformers',
        // Note: Emotion exclusions removed since react-select replaced
        // Exclude potentially problematic libraries (but keep buffer for @dfinity/agent)
        'crypto-js',
        'jszip',
        // Exclude other CBOR libraries that might have BigNumber constructor issues
        'cbor',
        'cbor-js'
        // Note: All AI libraries and some crypto libraries excluded from bundling
      ],
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router',
      'react-router-dom',
      'scheduler',
      // Hook utilities removed due to dependency resolution issues
      // Note: Emotion dependencies removed since react-select replaced
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
    }
  }
});
