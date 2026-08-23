import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import "lenis/dist/lenis.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

const rumEndpoint = import.meta.env.VITE_RUM_ENDPOINT;
const shouldMonitorPerformance = import.meta.env.DEV
  || (typeof rumEndpoint === "string" && rumEndpoint.trim().length > 0);

if (typeof window !== "undefined" && shouldMonitorPerformance) {
  window.setTimeout(() => {
    import("./perf.js").then(({ initPerfMonitor }) => initPerfMonitor()).catch(() => undefined);
  }, 3500);
}

const loadExtendedFonts = () => import("./fonts.css");
if (typeof window !== "undefined") {
  let loaded = false;
  const loadOnce = () => {
    if (loaded) return;
    loaded = true;
    loadExtendedFonts();
  };
  if (document.documentElement.classList.contains("non-public-route")) {
    loadOnce();
  } else if ("requestIdleCallback" in window) {
    window.requestIdleCallback(loadOnce, { timeout: 1200 });
  } else {
    window.setTimeout(loadOnce, 600);
  }
}
