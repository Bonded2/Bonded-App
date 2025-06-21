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
// Global error handler
window.addEventListener('error', (event) => {
});
window.addEventListener('unhandledrejection', (event) => {
});
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { resetToFirstTimeUser } from "./utils/firstTimeUserReset";
import icpCanisterService from "./services/icpCanisterService";
import "./index.css"; // Import global styles
import { fontLoader } from "./utils/fontLoader"; // Load Google Fonts with fallbacks
// Initialize the app
const initializeApp = async () => {
  try {
    // Initialize ICP canister service first
    await icpCanisterService.initialize();
    
    // Only reset user data on first page load of a new session
    // Remove sessionStorage usage - ICP canister service handles session state
    // Skip reset for now - let the user naturally authenticate through ICP
    // Render the app
    const container = document.getElementById("root");
    if (container) {
      createRoot(container).render(
        <StrictMode>
          <App />
        </StrictMode>
      );
    } else {
      // Root container not found
    }
  } catch (error) {
    // Failed to initialize app
  }
};
// Initialize immediately or wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
