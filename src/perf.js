/**
 * Điểm tập trung cho performance budget, RUM va trace marker.
 * RUM chi duoc gui khi VITE_RUM_ENDPOINT duoc cau hinh.
 */

export const PERF_BUDGET = Object.freeze({
  desktop: Object.freeze({
    cls: 0.1,
    dynamicLayers: 12,
    fcp: 1800,
    frameMs: 16.67,
    inp: 150,
    lcp: 2000,
    longTask: 50,
    sceneUpdateMs: 4,
    ttfb: 800,
  }),
  mobile: Object.freeze({
    cls: 0.1,
    dynamicLayers: 8,
    fcp: 2200,
    frameMs: 20,
    inp: 200,
    lcp: 2500,
    longTask: 80,
    sceneUpdateMs: 6,
    ttfb: 1000,
  }),
  bundle: Object.freeze({
    cssGzipKb: 30,
    jsGzipKb: 90,
    totalCodeGzipKb: 200,
  }),
});

const MAX_LONG_TASKS = 50;
const MAX_SCROLL_SESSIONS = 12;
const MAX_SCENE_SUMMARY = 12;
const isDev = import.meta.env.DEV;
const showOverlay = isDev && ["1", "true"].includes(import.meta.env.VITE_PERF_OVERLAY);

const metrics = {
  cls: null,
  dynamicLayerCount: 0,
  dynamicLayerPeak: 0,
  fcp: null,
  frameBudgetViolations: 0,
  frameCount: 0,
  inp: null,
  lcp: null,
  longTasks: [],
  sceneUpdates: {},
  scrollSessions: [],
  ttfb: null,
  worstFrameMs: 0,
};

let initialized = false;
let longTaskObserver = null;
let overlayEl = null;
let overlayStyleEl = null;
let overlayTimer = null;
let rumEndpoint = "";
let rumSummarySent = false;

let frameMeasuring = false;
let frameId = null;
let frameLastTime = 0;
let frameSession = null;
let dynamicLayerWarningActive = false;
let scrollTimer = null;

function getConnection() {
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection;
}

export function getPerformanceProfile() {
  const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches;
  const narrowViewport = window.matchMedia?.("(max-width: 680px)").matches;
  return coarsePointer || narrowViewport ? "mobile" : "desktop";
}

export function getPerformanceBudget() {
  return PERF_BUDGET[getPerformanceProfile()];
}

function metricLabel(name, value) {
  return name === "cls" ? value.toFixed(3) : `${Math.round(value)}ms`;
}

function scheduleOverlayUpdate() {
  if (!showOverlay || !overlayEl || overlayTimer !== null) return;

  overlayTimer = window.setTimeout(() => {
    overlayTimer = null;
    renderOverlay();
  }, 250);
}

function sendRum(type, payload) {
  if (!rumEndpoint || typeof navigator === "undefined") return;

  const connection = getConnection();
  const body = JSON.stringify({
    application: "xa-me-linh-ha-noi",
    connection: connection?.effectiveType || "unknown",
    deviceMemory: navigator.deviceMemory || null,
    occurredAt: Date.now(),
    path: window.location.pathname,
    profile: getPerformanceProfile(),
    type,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    ...payload,
  });

  try {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon?.(rumEndpoint, blob)) return;

    void fetch(rumEndpoint, {
      body,
      headers: { "content-type": "application/json" },
      keepalive: true,
      method: "POST",
    });
  } catch {
    // RUM khong duoc phep lam hong trang khi endpoint hoac mang loi.
  }
}

function handleMetric(name, metric) {
  const value = metric.value;
  const budget = getPerformanceBudget();
  metrics[name] = value;

  if (isDev) {
    const overBudget = value > budget[name];
    const prefix = overBudget ? "[perf] budget exceeded" : "[perf]";
    console[overBudget ? "warn" : "info"](
      `${prefix} ${name.toUpperCase()} = ${metricLabel(name, value)} (budget ${metricLabel(name, budget[name])})`,
    );
  }

  sendRum("web-vital", {
    budget: budget[name],
    id: metric.id,
    name,
    rating: metric.rating,
    value,
  });
  scheduleOverlayUpdate();
}

async function initWebVitals() {
  const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import("web-vitals");

  if (!initialized) return;
  onLCP((metric) => handleMetric("lcp", metric));
  onINP((metric) => handleMetric("inp", metric));
  onCLS((metric) => handleMetric("cls", metric));
  onFCP((metric) => handleMetric("fcp", metric));
  onTTFB((metric) => handleMetric("ttfb", metric));
}

function initLongTaskObserver() {
  if (typeof PerformanceObserver === "undefined") return;

  try {
    longTaskObserver = new PerformanceObserver((list) => {
      const budget = getPerformanceBudget();

      for (const entry of list.getEntries()) {
        const task = {
          duration: Math.round(entry.duration),
          startTime: Math.round(entry.startTime),
          timestamp: Date.now(),
        };
        metrics.longTasks.push(task);
        if (metrics.longTasks.length > MAX_LONG_TASKS) metrics.longTasks.shift();

        if (isDev && task.duration > budget.longTask) {
          console.warn(`[perf] long task ${task.duration}ms (budget ${budget.longTask}ms)`);
        }
      }

      scheduleOverlayUpdate();
    });

    longTaskObserver.observe({ buffered: true, type: "longtask" });
  } catch {
    // Long Task API khong co tren browser hien tai.
  }
}

function resetFrameSession() {
  frameSession = {
    droppedFrames: 0,
    frameCount: 0,
    startedAt: performance.now(),
    totalMs: 0,
    worstFrameMs: 0,
  };
}

function measureFrame(now) {
  if (!frameMeasuring || !frameSession) {
    frameId = null;
    return;
  }

  const delta = now - frameLastTime;
  frameLastTime = now;
  const budget = getPerformanceBudget();

  // Bỏ qua frame dau va frame bi ngat vi tab/background.
  if (delta > 0 && delta < 200) {
    frameSession.frameCount += 1;
    frameSession.totalMs += delta;
    frameSession.worstFrameMs = Math.max(frameSession.worstFrameMs, delta);

    if (delta > budget.frameMs) {
      frameSession.droppedFrames += 1;
      metrics.frameBudgetViolations += 1;
    }
  }

  frameId = window.requestAnimationFrame(measureFrame);
}

function startFrameMeasurement() {
  if (frameMeasuring) return;

  frameMeasuring = true;
  resetFrameSession();
  frameLastTime = performance.now();
  frameId = window.requestAnimationFrame(measureFrame);
}

function stopFrameMeasurement() {
  if (!frameMeasuring) return;

  frameMeasuring = false;
  if (frameId !== null) {
    window.cancelAnimationFrame(frameId);
    frameId = null;
  }

  if (frameSession?.frameCount) {
    const session = {
      averageFrameMs: Number((frameSession.totalMs / frameSession.frameCount).toFixed(2)),
      droppedFrames: frameSession.droppedFrames,
      frameCount: frameSession.frameCount,
      worstFrameMs: Number(frameSession.worstFrameMs.toFixed(2)),
    };

    metrics.frameCount += session.frameCount;
    metrics.worstFrameMs = Math.max(metrics.worstFrameMs, session.worstFrameMs);
    metrics.scrollSessions.push(session);
    if (metrics.scrollSessions.length > MAX_SCROLL_SESSIONS) metrics.scrollSessions.shift();
    sendRum("scroll-frame", session);
  }

  frameSession = null;
  scheduleOverlayUpdate();
}

function onScroll() {
  startFrameMeasurement();
  window.clearTimeout(scrollTimer);
  scrollTimer = window.setTimeout(stopFrameMeasurement, 200);
}

function initScrollFrameMonitor() {
  window.addEventListener("scroll", onScroll, { passive: true });
}

/**
 * Runtime goi marker nay khi scene chuyen state. Marker chi xuat hien o
 * lifecycle, khong tao hang nghin entry trong trace khi cuon.
 */
export function markMotionScene(sceneName, phase) {
  if (!sceneName || typeof performance === "undefined") return;

  performance.mark?.(`motion:${sceneName}:${phase}`);
}

/**
 * Runtime goi sau moi update. Chi tong hop so lieu; khong ghi layout hay log
 * trong scroll frame.
 */
export function recordMotionSceneUpdate(sceneName, duration) {
  if (!sceneName || !Number.isFinite(duration)) return;

  const summary = metrics.sceneUpdates[sceneName] || {
    calls: 0,
    longestMs: 0,
    totalMs: 0,
  };
  summary.calls += 1;
  summary.longestMs = Math.max(summary.longestMs, duration);
  summary.totalMs += duration;
  metrics.sceneUpdates[sceneName] = summary;

  if (isDev && duration > getPerformanceBudget().sceneUpdateMs) {
    console.warn(`[perf] scene ${sceneName} took ${duration.toFixed(2)}ms`);
  }
}

export function recordActiveMotionLayers(count) {
  metrics.dynamicLayerCount = count;
  metrics.dynamicLayerPeak = Math.max(metrics.dynamicLayerPeak, count);

  const overBudget = count > getPerformanceBudget().dynamicLayers;
  if (isDev && overBudget && !dynamicLayerWarningActive) {
    console.warn(`[perf] active motion layers ${count} exceed the budget`);
  }
  dynamicLayerWarningActive = overBudget;
  scheduleOverlayUpdate();
}

function averageFrameMs() {
  const allSessions = metrics.scrollSessions;
  const totalFrames = allSessions.reduce((total, session) => total + session.frameCount, 0);
  if (!totalFrames) return 0;
  const totalMs = allSessions.reduce(
    (total, session) => total + session.averageFrameMs * session.frameCount,
    0,
  );
  return totalMs / totalFrames;
}

function sceneSummary() {
  return Object.entries(metrics.sceneUpdates)
    .map(([name, item]) => ({
      averageMs: Number((item.totalMs / item.calls).toFixed(3)),
      calls: item.calls,
      longestMs: Number(item.longestMs.toFixed(3)),
      name,
      totalMs: item.totalMs,
    }))
    .sort((a, b) => b.totalMs - a.totalMs || b.longestMs - a.longestMs)
    .slice(0, MAX_SCENE_SUMMARY)
    .map(({ totalMs, ...item }) => item);
}

function sendRumSummary() {
  if (rumSummarySent) return;
  rumSummarySent = true;

  stopFrameMeasurement();
  sendRum("page-summary", {
    metrics: {
      cls: metrics.cls,
      fcp: metrics.fcp,
      inp: metrics.inp,
      lcp: metrics.lcp,
      ttfb: metrics.ttfb,
    },
    longTaskCount: metrics.longTasks.length,
    scenes: sceneSummary(),
    scroll: {
      averageFrameMs: Number(averageFrameMs().toFixed(2)),
      dynamicLayerPeak: metrics.dynamicLayerPeak,
      frameBudgetViolations: metrics.frameBudgetViolations,
      frameCount: metrics.frameCount,
      worstFrameMs: metrics.worstFrameMs,
    },
  });
}

function onPageHide() {
  sendRumSummary();
}

function badge(value, budget, unit = "ms") {
  if (value === null || value === undefined) {
    return '<span class="perf-badge perf-pending">-</span>';
  }

  const display = unit ? `${Math.round(value)}${unit}` : value.toFixed(3);
  const overBudget = value > budget;
  return `<span class="perf-badge ${overBudget ? "perf-over" : "perf-ok"}">${display}</span>`;
}

function renderOverlay() {
  if (!overlayEl) return;

  const budget = getPerformanceBudget();
  const recentLongTasks = metrics.longTasks.filter((task) => Date.now() - task.timestamp < 30000);
  const avgFrame = averageFrameMs();
  const avgFps = avgFrame ? (1000 / avgFrame).toFixed(0) : "-";

  overlayEl.innerHTML = `
    <div class="perf-title">Performance: ${getPerformanceProfile()}</div>
    <div class="perf-grid">
      <span>LCP</span>${badge(metrics.lcp, budget.lcp)}
      <span>INP</span>${badge(metrics.inp, budget.inp)}
      <span>CLS</span>${badge(metrics.cls, budget.cls, "")}
      <span>FCP</span>${badge(metrics.fcp, budget.fcp)}
    </div>
    <div class="perf-divider"></div>
    <div class="perf-grid">
      <span>FPS avg</span><span class="perf-badge ${avgFrame > budget.frameMs ? "perf-over" : "perf-ok"}">${avgFps}</span>
      <span>Worst</span><span class="perf-badge ${metrics.worstFrameMs > budget.frameMs * 2 ? "perf-over" : "perf-ok"}">${metrics.worstFrameMs.toFixed(1)}ms</span>
      <span>Long tasks</span><span class="perf-badge ${recentLongTasks.length ? "perf-over" : "perf-ok"}">${recentLongTasks.length}</span>
      <span>Layers</span><span class="perf-badge ${metrics.dynamicLayerCount > budget.dynamicLayers ? "perf-over" : "perf-ok"}">${metrics.dynamicLayerCount}/${budget.dynamicLayers}</span>
    </div>
  `;
}

function createOverlay() {
  if (!showOverlay || overlayEl) return;

  overlayEl = document.createElement("div");
  overlayEl.id = "perf-overlay";
  overlayEl.setAttribute("aria-hidden", "true");
  overlayStyleEl = document.createElement("style");
  overlayStyleEl.textContent = `
    #perf-overlay { position: fixed; right: 12px; bottom: 12px; z-index: 99999; min-width: 176px; padding: 10px 12px; color: #e0e0e0; background: rgba(10, 10, 15, 0.92); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; font: 11px/1.5 "SF Mono", "Fira Code", monospace; pointer-events: none; }
    .perf-title { margin-bottom: 6px; color: #fff; font-weight: 700; }
    .perf-grid { display: grid; grid-template-columns: auto 1fr; gap: 2px 10px; }
    .perf-grid > span:nth-child(odd) { color: #999; font-size: 10px; text-transform: uppercase; }
    .perf-badge { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
    .perf-ok { color: #4ade80; }.perf-over { color: #f87171; }.perf-pending { color: #777; }
    .perf-divider { height: 1px; margin: 6px 0; background: rgba(255, 255, 255, 0.1); }
  `;

  document.head.appendChild(overlayStyleEl);
  document.body.appendChild(overlayEl);
  renderOverlay();
}

/**
 * Khoi dong monitor mot lan. Endpoint la opt-in de project co the ket noi
 * backend RUM rieng ma khong hard-code dich vu theo doi.
 */
export function initPerfMonitor({ endpoint = import.meta.env.VITE_RUM_ENDPOINT } = {}) {
  if (initialized) return;
  initialized = true;
  rumSummarySent = false;
  rumEndpoint = typeof endpoint === "string" ? endpoint.trim() : "";

  void initWebVitals().catch(() => undefined);
  initLongTaskObserver();
  initScrollFrameMonitor();
  window.addEventListener("pagehide", onPageHide, { passive: true });

  if (isDev) {
    if (showOverlay) createOverlay();
    console.info("[perf] monitor started", { budget: getPerformanceBudget(), rum: Boolean(rumEndpoint) });
  }
}

export function getPerfMetrics() {
  return {
    ...metrics,
    averageFrameMs: averageFrameMs(),
    longTasks: [...metrics.longTasks],
    sceneUpdates: Object.fromEntries(
      Object.entries(metrics.sceneUpdates).map(([name, item]) => [name, { ...item }]),
    ),
    scrollSessions: [...metrics.scrollSessions],
  };
}

export function destroyPerfMonitor() {
  if (!initialized) return;
  initialized = false;

  sendRumSummary();
  longTaskObserver?.disconnect();
  longTaskObserver = null;
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("pagehide", onPageHide);
  window.clearTimeout(scrollTimer);
  window.clearTimeout(overlayTimer);
  stopFrameMeasurement();

  overlayEl?.remove();
  overlayStyleEl?.remove();
  overlayEl = null;
  overlayStyleEl = null;
  overlayTimer = null;
}
