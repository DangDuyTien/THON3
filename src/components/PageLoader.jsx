import { useEffect, useState } from "react";

function LoaderMark({ onAnimationEnd }) {
  return (
    <span className="site-loader-mark">
      <svg
        aria-hidden="true"
        className="site-loader-signature"
        viewBox="0 0 470 128"
      >
        {/* Background ghost guide lines */}
        <g className="sig-guide">
          {/* T */}
          <path d="M 35,34 H 105" />
          <path d="M 70,34 V 94" />

          {/* H */}
          <path d="M 130,34 V 94" />
          <path d="M 130,64 H 180" />
          <path d="M 180,34 V 94" />

          {/* Ô */}
          <path d="M 235,34 C 200,34 200,94 235,94 C 270,94 270,34 235,34 Z" />
          <path d="M 220,22 L 235,10 L 250,22" />

          {/* N */}
          <path d="M 295,94 V 34 L 350,94 V 34" />

          {/* 3 */}
          <path d="M 385,34 H 430 L 406,60 C 428,60 436,72 436,83 C 436,94 416,94 385,94" />

          {/* Underline */}
          <path d="M 35,110 H 435" />
        </g>

        {/* Foreground animated drawing strokes */}
        <g className="sig-draw">
          {/* T */}
          <path d="M 35,34 H 105" pathLength="1" className="sig-path sig-t" />
          <path d="M 70,34 V 94" pathLength="1" className="sig-path sig-t" />

          {/* H */}
          <path d="M 130,34 V 94" pathLength="1" className="sig-path sig-h" />
          <path d="M 130,64 H 180" pathLength="1" className="sig-path sig-h" />
          <path d="M 180,34 V 94" pathLength="1" className="sig-path sig-h" />

          {/* Ô */}
          <path d="M 235,34 C 200,34 200,94 235,94 C 270,94 270,34 235,34 Z" pathLength="1" className="sig-path sig-o" />
          <path d="M 220,22 L 235,10 L 250,22" pathLength="1" className="sig-path sig-o" />

          {/* N */}
          <path d="M 295,94 V 34 L 350,94 V 34" pathLength="1" className="sig-path sig-n" />

          {/* 3 */}
          <path d="M 385,34 H 430 L 406,60 C 428,60 436,72 436,83 C 436,94 416,94 385,94" pathLength="1" className="sig-path sig-3" />

          {/* Underline accent line */}
          <path
            d="M 35,110 H 435"
            pathLength="1"
            className="sig-path sig-line"
            onAnimationEnd={onAnimationEnd}
          />
        </g>
      </svg>
    </span>
  );
}

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

export default function PageLoader() {
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [running, setRunning] = useState(false);
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
    const removeTimer = window.setTimeout(() => setMounted(false), prefersReducedMotion ? 80 : 700);
    return () => window.clearTimeout(removeTimer);
  }, [prefersReducedMotion, ready]);

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
        <LoaderMark onAnimationEnd={handleOrbitAnimationEnd} />
        <span className="site-loader-caption">XÃ MÊ LINH</span>
      </div>
      <p className="site-loader-label">ĐANG TẢI</p>
    </div>
  );
}
