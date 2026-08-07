import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "lenis/dist/lenis.css";
import App from "./App.jsx";
import "./styles.css";
import { initPerfMonitor } from "./perf.js";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

initPerfMonitor();
