import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { apiUrl } from "../lib/backend-api.js";
import SiteLoaderMark from "./SiteLoaderMark.jsx";

const AUTO_RETRY_DELAY_MS = 5000;

function getConnectionTarget() {
  try {
    const fallbackOrigin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
    const endpoint = new URL(apiUrl("/api/content/published"), fallbackOrigin);
    return `${endpoint.origin}${endpoint.pathname}`;
  } catch {
    return "máy chủ nội dung";
  }
}

function formatTraceTime(startedAt) {
  const elapsed = Math.max(0, Date.now() - startedAt);
  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  const milliseconds = elapsed % 1000;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

function getConnectionEvent({ attempt = 0, code = "", cycle = 1, payloadCharacters = 0, phase = "starting" } = {}, target) {
  const cycleId = String(cycle).padStart(2, "0");
  const attemptId = String(attempt).padStart(2, "0");
  if (phase === "connecting") return `SEND  GET ${target}  CYCLE=${cycleId} ATTEMPT=${attemptId}`;
  if (phase === "timedOut") return `${code || "REQUEST_TIMEOUT"}  ATTEMPT=${attemptId} AFTER=12000ms`;
  if (phase === "retrying") return `${code || "NETWORK_ERROR"}  ATTEMPT=${attemptId} RETRY_IN=2000ms`;
  if (phase === "connected") return `OK    CONTENT_RECEIVED  CHARS=${payloadCharacters}`;
  if (phase === "rejected") return `${code || "REQUEST_REJECTED"}  CYCLE=${cycleId} NEXT_CYCLE=5000ms`;
  if (phase === "waiting") return `CLOSE CYCLE=${cycleId}  STATUS=NO_RESPONSE  NEXT_CYCLE=5000ms`;
  if (phase === "unavailable") return "ERROR API_TARGET_NOT_CONFIGURED";
  return `BOOT  OPEN_CONNECTION  CYCLE=${cycleId}`;
}

export { SiteLoaderMark as LoaderMark };
export default function PageLoader({ connectionStatus, contentError = "", contentReady = true, onExitComplete, onRetry }) {
  const [countdown, setCountdown] = useState(90);
  const [drawComplete, setDrawComplete] = useState(false);
  const [drawCycle, setDrawCycle] = useState(0);
  const [mediaReady, setMediaReady] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [running, setRunning] = useState(false);
  const [traceLines, setTraceLines] = useState([]);
  const countdownDeadlineRef = useRef(Date.now() + 90000);
  const exitCompleteRef = useRef(false);
  const initialTraceRef = useRef(false);
  const lastConnectionEventRef = useRef("");
  const requestStartedAtRef = useRef(Date.now());
  const retryTimerRef = useRef(null);
  const traceStartedAtRef = useRef(Date.now());
  const prefersReducedMotion = typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const connectionTarget = getConnectionTarget();
  const ready = drawComplete && contentReady && mediaReady;

  const appendTrace = useCallback((message) => {
    const nextLine = `[${formatTraceTime(traceStartedAtRef.current)}] ${message}`;
    setTraceLines((current) => [...current, nextLine].slice(-9));
  }, []);

  useEffect(() => {
    if (initialTraceRef.current) return;
    initialTraceRef.current = true;
    const online = typeof navigator === "undefined" || navigator.onLine ? "YES" : "NO";
    const protocol = connectionTarget.startsWith("https://") ? "HTTPS" : "HTTP";
    appendTrace(`NET   ONLINE=${online} PROTOCOL=${protocol}`);
    appendTrace(`API   TARGET=${connectionTarget}`);
    appendTrace("HTTP  METHOD=GET CREDENTIALS=INCLUDE");
  }, [appendTrace, connectionTarget]);

  useEffect(() => {
    const eventKey = `${connectionStatus?.cycle}:${connectionStatus?.attempt}:${connectionStatus?.phase}`;
    if (lastConnectionEventRef.current === eventKey) return;
    lastConnectionEventRef.current = eventKey;
    if (connectionStatus?.phase === "connecting") requestStartedAtRef.current = Date.now();
    appendTrace(getConnectionEvent(connectionStatus, connectionTarget));
  }, [appendTrace, connectionStatus, connectionTarget]);

  useEffect(() => {
    if (contentReady || connectionStatus?.phase !== "connecting") return undefined;
    const timer = window.setInterval(() => {
      const elapsedSeconds = Math.max(1, Math.floor((Date.now() - requestStartedAtRef.current) / 1000));
      const attempt = String(connectionStatus?.attempt || 0).padStart(2, "0");
      appendTrace(`WAIT  RESPONSE ATTEMPT=${attempt} ELAPSED=${elapsedSeconds}s`);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [appendTrace, connectionStatus?.attempt, connectionStatus?.phase, contentReady]);

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
    const markReady = () => {
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
    if (contentReady) return undefined;
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((countdownDeadlineRef.current - Date.now()) / 1000));
      setCountdown(remaining);
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 250);
    return () => window.clearInterval(timer);
  }, [contentError, contentReady]);

  useEffect(() => {
    if (contentReady || !contentError || !onRetry) return undefined;

    countdownDeadlineRef.current = Date.now() + AUTO_RETRY_DELAY_MS;
    setCountdown(Math.ceil(AUTO_RETRY_DELAY_MS / 1000));
    retryTimerRef.current = window.setTimeout(() => {
      retryTimerRef.current = null;
      countdownDeadlineRef.current = Date.now() + 90000;
      setCountdown(90);
      setMediaReady(false);
      onRetry();
    }, AUTO_RETRY_DELAY_MS);

    return () => {
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [contentError, contentReady, onRetry]);

  useEffect(() => {
    if (!drawComplete || contentReady || prefersReducedMotion) return undefined;
    const timer = window.setInterval(() => setDrawCycle((cycle) => cycle + 1), 2100);
    return () => window.clearInterval(timer);
  }, [contentReady, drawComplete, prefersReducedMotion]);

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
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    countdownDeadlineRef.current = Date.now() + 90000;
    setCountdown(90);
    setMediaReady(false);
    onRetry?.();
  };

  if (!mounted) return null;

  const waitingForBackend = drawComplete && !contentReady;
  const showConnectionTrace = drawComplete && (!contentReady || !mediaReady);
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
        {showConnectionTrace && (
          <div className="site-loader-wait">
            <div className="site-loader-connection">
              <span className="site-loader-wait-label">LIVE CONNECTION TRACE</span>
              <strong className="site-loader-target">{connectionTarget}</strong>
              <div className="site-loader-trace" role="log" aria-live="polite" aria-relevant="additions text">
                {traceLines.map((line) => (
                  <span className="site-loader-trace-line" key={line}>{line}</span>
                ))}
              </div>
            </div>
            {!contentReady && (
              <>
                <span className="site-loader-wait-label">
                  {contentError ? "LẦN KIỂM TRA TIẾP THEO" : "THỜI GIAN CÒN LẠI CỦA CHU KỲ"}
                </span>
                <strong className="site-loader-countdown" aria-label={`Còn ${countdown} giây`}>
                  00:{String(countdown).padStart(2, "0")}
                </strong>
                {contentError ? (
                  <button type="button" className="site-loader-retry" onClick={handleRetry}>
                    <RefreshCw aria-hidden="true" />
                    <span>Kiểm tra ngay</span>
                  </button>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
      <p className="site-loader-label">{statusLabel}</p>
    </div>
  );
}
