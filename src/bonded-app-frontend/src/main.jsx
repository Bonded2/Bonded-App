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
console.log('🔧 React global setup - React available:', !!window.React);

// Global error handler
window.addEventListener('error', (event) => {
  console.error('❌ Global error caught:', event.error);
  console.error('Message:', event.message);
  console.error('Filename:', event.filename);
  console.error('Line:', event.lineno, 'Column:', event.colno);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection:', event.reason);
});

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { resetToFirstTimeUser } from "./utils/firstTimeUserReset";
import "./index.css"; // Import global styles
import { fontLoader } from "./utils/fontLoader"; // Load Google Fonts with fallbacks

// Initialize the app
const initializeApp = async () => {
  console.log("🚀 Initializing Bonded app...");
  console.log("📍 Current URL:", window.location.href);
  console.log("🔍 Document ready state:", document.readyState);
  
  try {
    // Only reset user data on first page load of a new session
    if (!sessionStorage.getItem('sessionStarted')) {
      console.log("🔄 First time session, resetting user data...");
      await resetToFirstTimeUser();
      // The App component will set the sessionStarted flag
    }
    
    // Render the app
    const container = document.getElementById("root");
    console.log("🏷️ Root container found:", !!container);
    
    if (container) {
      console.log("🎨 Creating React root and rendering app...");
      createRoot(container).render(
        <StrictMode>
          <App />
        </StrictMode>
      );
      console.log("✅ React app rendered successfully");
    } else {
      console.error("❌ Target container with id 'root' not found in the DOM");
    }
  } catch (error) {
    console.error("❌ Failed to initialize app:", error);
    console.error("Stack trace:", error.stack);
  }
};

// Initialize immediately or wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
