// Import polyfills first
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
