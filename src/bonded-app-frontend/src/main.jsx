import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

// Make sure the DOM is fully loaded before trying to access the element
document.addEventListener("DOMContentLoaded", () => {
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
