import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { resetToFirstTimeUser } from "./utils/firstTimeUserReset";
import "./index.css"; // Import global styles

// Make sure the DOM is fully loaded before trying to access the element
document.addEventListener("DOMContentLoaded", async () => {
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
    console.error("Target container with id 'root' not found in the DOM");
  }
});
