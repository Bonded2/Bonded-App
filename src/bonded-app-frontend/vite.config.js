import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import EnvironmentPlugin from "vite-plugin-environment";
import dotenv from "dotenv";
import path, { resolve } from "path";
import { createRequire } from "module";

// Load env from this package root
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const isDev =
  process.env["DFX_NETWORK"] !== "ic" && process.env["NODE_ENV"] !== "production";
const isProduction =
  process.env.NODE_ENV === "production" || process.env["DFX_NETWORK"] === "ic";

const buildMode = process.env.VITE_BUILD_MODE || "normal";
const isLaptopBuild =
  buildMode === "laptop" ||
  buildMode === "fast" ||
  buildMode === "emergency" ||
  buildMode === "minimal";
const excludeAI =
  process.env.EXCLUDE_AI_MODELS === "true" ||
  buildMode === "fast" ||
  buildMode === "emergency" ||
  buildMode === "minimal";
const isMinimalBuild = buildMode === "minimal";

// DFX network (default local for dev)
const network = process.env["DFX_NETWORK"] || "local";
const require = createRequire(import.meta.url);

export default defineConfig({
  // IMPORTANT for canister hosting: make asset URLs relative
  base: "./",

  plugins: [
    react({
      jsxRuntime: "automatic",
      fastRefresh: process.env.NODE_ENV !== "production",
    }),

    // Expose envs (VITE_*, DFX_*, CANISTER_*)
    EnvironmentPlugin("all", { prefix: "CANISTER_" }),
    EnvironmentPlugin("all", { prefix: "DFX_" }),
    EnvironmentPlugin("all", { prefix: "VITE_" }),

    // Custom resolver for ICP pkgs only in dev; let prod bundle normally
    {
      name: "icp-package-resolver",
      enforce: "pre",
      resolveId(id) {
        if (id.startsWith("@dfinity/")) {
          // Dev may point to your polyfill; prod must bundle real packages
          if (isDev) return resolve(__dirname, "src/utils/icpPolyfill.js");
          return null; // bundle normally in production
        }

        // Optional dev-only service shims
        if (isDev && id.endsWith("canisterIntegration.js")) {
          return resolve(__dirname, "src/services/canisterIntegration.dev.js");
        }

        return null;
      },
    },

    // BigInt-elimination is kept but disabled for dev & minimal safe-guards
    ...(isLaptopBuild
      ? []
      : [
          {
            name: "selective-bigint-elimination",
            enforce: "pre",
            transform(code, id) {
              if (
                id.includes("bigint-replacement.js") ||
                id.includes("bigint-polyfill.js")
              )
                return null;

              if (
                id.includes("@noble/curves") ||
                id.includes("@noble/hashes") ||
                id.includes("@noble/")
              )
                return null;

              if (id.includes("node_modules") && isLaptopBuild) return null;
              if (isDev) return null;

              if (code.includes("BigInt") || code.includes("bigint")) {
                // Avoid touching CBOR/serializers
                if (
                  id.includes("cbor") ||
                  id.includes("serializer") ||
                  id.includes("deserializer") ||
                  id.includes("SelfDescribeCborSerializer") ||
                  id.includes("borc") ||
                  id.includes("cbor-web") ||
                  id.includes("cbor-") ||
                  id.includes("/cbor/") ||
                  id.includes("Cbor") ||
                  id.includes("CBOR") ||
                  code.includes("SelfDescribeCborSerializer") ||
                  code.includes("new Decoder") ||
                  code.includes("cbor.encode") ||
                  code.includes("cbor.decode")
                ) {
                  return null;
                }

                let transformedCode = code
                  .replace(
                    /\bBigInt\s*\(/g,
                    '((value) => { try { return typeof value === "string" ? parseInt(value, 10) || 0 : Number(value) || 0; } catch(e) { return 0; } })('
                  )
                  .replace(
                    /typeof\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*===\s*['"]bigint['"]/g,
                    'typeof $1 === "number"'
                  )
                  .replace(
                    /typeof\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*!==\s*['"]bigint['"]/g,
                    'typeof $1 !== "number"'
                  )
                  .replace(/([a-zA-Z_$][a-zA-Z0-9_$]*)\s*instanceof\s*BigInt/g, 'typeof $1 === "number"')
                  .replace(/\b(\d+)n\b/g, "$1")
                  .replace(/BigInt\.prototype/g, "Number.prototype")
                  .replace(/BigInt\.asIntN\s*\(/g, "((bits, value) => Number(value) || 0)(")
                  .replace(/BigInt\.asUintN\s*\(/g, "((bits, value) => Math.abs(Number(value)) || 0)(")
                  .replace(/new\s+BigInt\s*\(/g, "((value) => Number(value) || 0)(")
                  .replace(/:\s*bigint\b/g, ": number")
                  .replace(/\|\s*bigint\b/g, "| number")
                  .replace(/bigint\s*\|/g, "number |")
                  .replace(/\{\s*([^}]*)\s*\}\s*:\s*\{[^}]*bigint[^}]*\}/g, (m) =>
                    m.replace(/bigint/g, "number")
                  );

                if (transformedCode !== code) {
                  console.log(
                    `🔧 [BigInt-Elimination] Fixed: ${id.split("/").pop()}`
                  );
                  return { code: transformedCode, map: null };
                }
              }

              return null;
            },
          },
        ]),
  ],

  esbuild: {
    target: "es2020",
    keepNames: true,
    minifyIdentifiers: false,
    minifySyntax: isProduction,
    minifyWhitespace: isProduction,
    legalComments: "none",
    treeShaking: true,
  },

  optimizeDeps: {
    // dev-time prebundle choices
    exclude: [
      ...(excludeAI || isLaptopBuild
        ? [
            "@xenova/transformers",
            "onnxruntime-web",
            "tesseract.js",
            "nsfwjs",
            "@tensorflow/tfjs",
            "@tensorflow/tfjs-backend-wasm",
            "@tensorflow/tfjs-backend-webgl",
          ]
        : []),
      // keep ICP SDK out of optimizeDeps to avoid dev resolution issues
      "@dfinity/identity",
      "@dfinity/agent",
      "@dfinity/auth-client",
      "@dfinity/candid",
      "@dfinity/principal",
    ],
    include: isProduction ? [] : ["react", "react-dom", "react-router-dom"],
    esbuildOptions: { target: "es2020" },
  },

  root: path.join(__dirname),

  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: isLaptopBuild ? 5000 : isProduction ? 1000 : 2000,
    target: "es2020",
    minify: isLaptopBuild ? false : isProduction ? "esbuild" : false,
    cssMinify: isLaptopBuild ? false : "esbuild",
    reportCompressedSize: false,
    emptyOutDir: true,

    rollupOptions: {
      maxParallelFileOps: isLaptopBuild ? 1 : 2,

      plugins: [
        {
          name: "resolve-polyfill-issues",
          resolveId(id) {
            if (id.includes("define-globalThis-property") && id.includes("?commonjs-external"))
              return { id: "polyfill-globalThis", external: false };
            if (id.includes("../internals/define-globalThis-property"))
              return { id: "polyfill-globalThis", external: false };
            if (id.includes("../internals/globalThis") && id.includes("?commonjs-external"))
              return { id: "polyfill-globalThis", external: false };
            if (id.includes("../internals/globalThis"))
              return { id: "polyfill-globalThis", external: false };
            if (id.includes("../internals/") && id.includes("?commonjs-external"))
              return { id: "polyfill-globalThis", external: false };
            return null;
          },
          load(id) {
            if (id === "polyfill-globalThis") {
              return "export default globalThis;";
            }
            return null;
          },
        },
      ],

      // ✅ DO NOT externalize @dfinity/* in production bundles
      external: [
        // Keep AI libs external only if you want smaller vendor bundles
        ...(excludeAI || isLaptopBuild
          ? [
              "@xenova/transformers",
              "onnxruntime-web",
              "@noble/curves/bls12-381",
              "tesseract.js",
              "nsfwjs",
              "@tensorflow/tfjs",
              "@tensorflow/tfjs-backend-wasm",
              "@tensorflow/tfjs-backend-webgl",
            ]
          : []),
      ],

      output: {
        manualChunks: (id) => {
          if (isMinimalBuild) return "main";

          if (isLaptopBuild) {
            if (id.includes("node_modules")) return "vendor";
            return "app";
          }

          if (isProduction) {
            if (id.includes("@dfinity/")) return "icp-sdk";
            if (id.includes("node_modules")) return "vendor";
          }

          return undefined;
        },
      },
    },
  },

  server: {
    port: 3000,
    host: true,
    hmr: { overlay: false },
    watch: { ignored: ["**/dist/**", "**/node_modules/**"] },
    headers: {
      "Cross-Origin-Embedder-Policy": "credentialless",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
    ...(isDev && {
      proxy: {
        "/api": {
          target: `http://127.0.0.1:4943`,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, "/api"),
        },
        "/.ic": {
          target: `http://127.0.0.1:4943`,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    }),
    fs: { allow: [".."] },
  },

  define: {
    __DEV__: isDev,
    __PROD__: isProduction,
    global: "globalThis",
    globalThis: "globalThis",

    // If you continue to inject these, ensure they are correct per-network
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
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
  },

  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@components": resolve(__dirname, "src/components"),
      "@services": resolve(__dirname, "src/services"),
      "@utils": resolve(__dirname, "src/utils"),
      "@screens": resolve(__dirname, "src/screens"),

      // browser polyfills
      buffer: "buffer",
      crypto: "crypto-browserify",
      stream: "stream-browserify",
      util: "util",
      process: "process/browser",

      // your bigint shim
      bigint: resolve(__dirname, "src/bigint-replacement.js"),

      // allow direct imports (dev resolver handles polyfill)
      "@dfinity/identity": "@dfinity/identity",
      "@dfinity/agent": "@dfinity/agent",
      "@dfinity/auth-client": "@dfinity/auth-client",
      "@dfinity/candid": "@dfinity/candid",
      "@dfinity/principal": "@dfinity/principal",
    },
    dedupe: ["globalThis", "core-js"],
  },
});
