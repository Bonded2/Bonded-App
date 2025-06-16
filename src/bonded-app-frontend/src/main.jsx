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
import "./index.css"; // Import global styles
import { fontLoader } from "./utils/fontLoader"; // Load Google Fonts with fallbacks
// Initialize the app
const initializeApp = async () => {
  try {
    // Only reset user data on first page load of a new session
    if (!sessionStorage.getItem('sessionStarted')) {
      await resetToFirstTimeUser();
      // The App component will set the sessionStarted flag
    }
    // Render the app
    const container = document.getElementById("root");
    if (container) {
      createRoot(container).render(
        <StrictMode>
          <App />
        </StrictMode>
      );
    } else {
    }
  } catch (error) {
  }
};
// Initialize immediately or wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
