// IMMEDIATE CBOR POLYFILL - Set before ANY imports
(function() {
  'use strict';
  const CborSerializer = class SelfDescribeCborSerializer {
    constructor() { this.buffer = []; }
    serialize(value) {
      try {
        const jsonString = JSON.stringify(value, (key, val) => {
          if (typeof val === 'bigint') return Number(val);
          if (val instanceof Uint8Array) return Array.from(val);
          return val;
        });
        return new TextEncoder().encode(jsonString);
      } catch (e) {
        return new Uint8Array(0);
      }
    }
    static serialize(value) {
      return new this().serialize(value);
    }
  };
  
  // Ensure global is defined before using it
  if (typeof global === 'undefined') {
    globalThis.global = globalThis;
  }
  [window, globalThis, self, global].filter(Boolean).forEach(ctx => {
    if (ctx && typeof ctx === 'object') {
      ctx.SelfDescribeCborSerializer = CborSerializer;
      Object.defineProperty(ctx, 'SelfDescribeCborSerializer', {
        value: CborSerializer,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
  });
})();

// Import BigInt replacement FIRST - before any other imports
import './bigint-replacement.js';
// Import BigNumber polyfill for CBOR compatibility
import './utils/bignumber-polyfill.js';
// Ensure React is available globally for hook utilities before any other imports
import React from 'react';
if (typeof window !== 'undefined' && !window.React) {
  window.React = React;
}
if (typeof globalThis !== 'undefined' && !globalThis.React) {
  globalThis.React = React;
}
// Global error handler (simplified)
window.addEventListener('error', (event) => {
  // Silent error handling for production
});
window.addEventListener('unhandledrejection', (event) => {
  // Silent promise rejection handling for production
});
import ReactDOM from "react-dom/client";
import { App } from "./App.jsx";
import "./index.css"; // Import global styles

// ULTRA-MINIMAL: No blocking operations whatsoever
const root = ReactDOM.createRoot(document.getElementById("root"));

// Immediate render with no delays
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
