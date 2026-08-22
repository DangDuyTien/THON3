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

if (typeof window !== "undefined") {
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
    window.removeEventListener("scroll", loadOnce);
    window.removeEventListener("pointerdown", loadOnce);
    window.removeEventListener("keydown", loadOnce);
  };
  if (document.documentElement.classList.contains("non-public-route")) {
    loadOnce();
  } else {
    window.addEventListener("scroll", loadOnce, { passive: true, once: true });
    window.addEventListener("pointerdown", loadOnce, { once: true });
    window.addEventListener("keydown", loadOnce, { once: true });
    window.setTimeout(loadOnce, 3500);
  }
}
