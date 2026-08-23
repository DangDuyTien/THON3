import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import SiteLoaderMark from "./SiteLoaderMark.jsx";

export { SiteLoaderMark as LoaderMark };
export default function PageLoader({ contentError = "", contentReady = true, onExitComplete, onRetry }) {
  const [countdown, setCountdown] = useState(60);
  const [drawComplete, setDrawComplete] = useState(false);
  const [drawCycle, setDrawCycle] = useState(0);
  const [mediaReady, setMediaReady] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [running, setRunning] = useState(false);
  const countdownDeadlineRef = useRef(Date.now() + 60000);
  const exitCompleteRef = useRef(false);
  const prefersReducedMotion = typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ready = drawComplete && contentReady && mediaReady;

  useEffect(() => {
    let cancelled = false;
    let started = false;
    let safetyTimer = null;

    const startMotion = () => {
      if (cancelled || started) return;
      started = true;
      setRunning(true);
      safetyTimer = window.setTimeout(() => {
        if (!cancelled) setDrawComplete(true);
      }, prefersReducedMotion ? 180 : 2400);
    };

    startMotion();

    return () => {
      cancelled = true;
      if (safetyTimer !== null) window.clearTimeout(safetyTimer);
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!contentReady) {
      setMediaReady(false);
      return undefined;
    }

    let cancelled = false;
    let image = null;
    const markReady = async () => {
      try {
        await image?.decode?.();
      } catch {
        // The load event below already confirms that the browser can render the image.
      }
      if (!cancelled && image?.complete && image.naturalWidth > 0) setMediaReady(true);
    };
    const frame = window.requestAnimationFrame(() => {
      image = document.querySelector("#home .story-slide-media img");
      if (!image) {
        setMediaReady(true);
        return;
      }
      if (image.complete && image.naturalWidth > 0) markReady();
      else image.addEventListener("load", markReady, { once: true });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      image?.removeEventListener("load", markReady);
    };
  }, [contentReady]);

  useEffect(() => {
    if (contentReady || contentError) return undefined;
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((countdownDeadlineRef.current - Date.now()) / 1000));
      setCountdown(remaining);
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 250);
    return () => window.clearInterval(timer);
  }, [contentError, contentReady]);

  useEffect(() => {
    if (!drawComplete || contentReady || contentError || prefersReducedMotion) return undefined;
    const timer = window.setInterval(() => setDrawCycle((cycle) => cycle + 1), 2100);
    return () => window.clearInterval(timer);
  }, [contentError, contentReady, drawComplete, prefersReducedMotion]);

  useEffect(() => {
    document.body.classList.toggle("site-loading", mounted);
    return () => document.body.classList.remove("site-loading");
  }, [mounted]);

  useEffect(() => {
    if (!ready) return undefined;
    const removeTimer = window.setTimeout(() => {
      if (!exitCompleteRef.current) {
        exitCompleteRef.current = true;
        onExitComplete?.();
      }
      setMounted(false);
    }, prefersReducedMotion ? 80 : 240);
    return () => window.clearTimeout(removeTimer);
  }, [onExitComplete, prefersReducedMotion, ready]);

  const handleOrbitAnimationEnd = (event) => {
    if (running && (event.animationName === "sig-draw-line" || event.animationName === "site-loader-orbit-spin")) {
      setDrawComplete(true);
    }
  };

  const handleRetry = () => {
    countdownDeadlineRef.current = Date.now() + 60000;
    setCountdown(60);
    setMediaReady(false);
    onRetry?.();
  };

  if (!mounted) return null;

  const waitingForBackend = drawComplete && !contentReady;
  const statusLabel = contentError
    ? "MÁY CHỦ CHƯA PHẢN HỒI"
    : !contentReady
      ? "ĐANG KHỞI ĐỘNG MÁY CHỦ"
      : !mediaReady
        ? "ĐANG CHUẨN BỊ ẢNH"
        : "ĐANG TẢI";

  return (
    <div
      aria-label="Đang tải Xã Mê Linh"
      aria-live="polite"
      className={"site-loader" + (running ? " is-running" : "") + (waitingForBackend ? " is-waiting" : "") + (ready ? " is-leaving" : "")}
      role="status"
    >
      <div className="site-loader-center">
        <SiteLoaderMark key={drawCycle} onAnimationEnd={handleOrbitAnimationEnd} />
        <span className="site-loader-caption">THÔN 3 / MÊ LINH</span>
        {waitingForBackend && (
          <div className="site-loader-wait">
            {contentError ? (
              <>
                <p>Chưa thể tải dữ liệu thật của trang.</p>
                <button type="button" className="site-loader-retry" onClick={handleRetry}>
                  <RefreshCw aria-hidden="true" />
                  <span>Thử lại</span>
                </button>
              </>
            ) : (
              <>
                <span className="site-loader-wait-label">ĐANG KẾT NỐI DỮ LIỆU</span>
                <strong className="site-loader-countdown" aria-label={`Còn ${countdown} giây`}>
                  00:{String(countdown).padStart(2, "0")}
                </strong>
              </>
            )}
          </div>
        )}
      </div>
      <p className="site-loader-label">{statusLabel}</p>
    </div>
  );
}
