import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { resetToFirstTimeUser } from "./utils/firstTimeUserReset";
import "./index.css"; // Import global styles
import { fontLoader } from "./utils/fontLoader"; // Load Google Fonts with fallbacks

// Initialize the app
const initializeApp = async () => {
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
    console.log("✅ React app rendered successfully");
  } else {
    console.error("❌ Target container with id 'root' not found in the DOM");
  }
};

// Initialize immediately or wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
