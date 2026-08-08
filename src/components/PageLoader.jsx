import { useEffect, useRef, useState } from "react";
import SiteLoaderMark from "./SiteLoaderMark.jsx";

export { SiteLoaderMark as LoaderMark };
function waitForCriticalResources() {
  const heroImage = document.querySelector(".hero img");
  const imageReady = heroImage?.decode
    ? heroImage.decode().catch(() => undefined)
    : Promise.resolve();
  const fontsReady = document.fonts?.ready || Promise.resolve();
  const documentReady = document.readyState === "complete"
    ? Promise.resolve()
    : new Promise((resolve) => {
      window.addEventListener("load", resolve, { once: true });
    });

  return Promise.all([imageReady, fontsReady, documentReady]);
}

export default function PageLoader({ onExitComplete }) {
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [running, setRunning] = useState(false);
  const exitCompleteRef = useRef(false);
  const prefersReducedMotion = typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    let cancelled = false;
    let started = false;
    let safetyTimer = null;

    const startMotion = () => {
      if (cancelled || started) return;
      started = true;
      setRunning(true);
      safetyTimer = window.setTimeout(() => {
        if (!cancelled) setReady(true);
      }, prefersReducedMotion ? 180 : 2500);
    };

    waitForCriticalResources().then(startMotion);
    const fallbackTimer = window.setTimeout(startMotion, 2900);

    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
      if (safetyTimer !== null) window.clearTimeout(safetyTimer);
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!ready) return undefined;
    const removeTimer = window.setTimeout(() => {
      if (!exitCompleteRef.current) {
        exitCompleteRef.current = true;
        onExitComplete?.();
      }
      setMounted(false);
    }, prefersReducedMotion ? 80 : 700);
    return () => window.clearTimeout(removeTimer);
  }, [onExitComplete, prefersReducedMotion, ready]);

  const handleOrbitAnimationEnd = (event) => {
    if (running && (event.animationName === "sig-draw-line" || event.animationName === "site-loader-orbit-spin")) {
      setReady(true);
    }
  };

  if (!mounted) return null;

  return (
    <div
      aria-label="Đang tải Xã Mê Linh"
      aria-live="polite"
      className={"site-loader" + (running ? " is-running" : "") + (ready ? " is-leaving" : "")}
      role="status"
    >
      <div className="site-loader-center">
        <SiteLoaderMark onAnimationEnd={handleOrbitAnimationEnd} />
        <span className="site-loader-caption">XÃ MÊ LINH</span>
      </div>
      <p className="site-loader-label">ĐANG TẢI</p>
    </div>
  );
}
