import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Capture } from "./screens/Capture";

createRoot(document.getElementById("app")).render(
  <StrictMode>
    <Capture />
  </StrictMode>,
);
