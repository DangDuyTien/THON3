import { createContourRenderer } from "./contour-draw.js";
import {
  markMotionScene,
  recordMotionSceneUpdate,
  shouldRecordMotionPerformance,
} from "./perf-hooks.js";
import { getPerformanceProfile, PERFORMANCE_PROFILE } from "./perf-profile.js";

const contourMounts = new WeakMap();

function getContourQuality() {
  if (window.matchMedia?.("(pointer: coarse), (max-width: 680px)").matches) return "mobile";
  return getPerformanceProfile() === PERFORMANCE_PROFILE.LOW ? "low" : "standard";
}

function getPixelRatioCap(quality, inWorker) {
  if (quality !== "standard") return 1;
  return inWorker ? 1.5 : 1.25;
}

function getCanvasSize(canvas, maximumRatio = 1.5) {
  const bounds = canvas.getBoundingClientRect();
  return {
    height: Math.max(bounds.height, 1),
    ratio: Math.min(window.devicePixelRatio || 1, maximumRatio),
    width: Math.max(bounds.width, 1),
  };
}

function getTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/**
 * Canvas duoc lap lich theo display frame de tu dong bam tan so quet cua man hinh.
 */
function createSharedContourLoop({
  canvas,
  onDraw,
  onPause,
  onResize,
  onResume,
  onThemeChange,
  pauseDuringScroll = false,
  pixelRatioCap = 1.5,
  queueFrame,
  sceneName = "page-contour",
  subscribeAnimationFrame,
}) {
  let resizeObserver = null;
  let scrollResumeTimer = null;
  let scrolling = false;
  let stopped = false;
  const supportsScrollEnd = "onscrollend" in window;
  let theme = getTheme();
  let themeObserver = null;
  let canvasVisible = true;

  let unsubscribeAnimationFrame = subscribeAnimationFrame((time) => {
    if (stopped || document.hidden || !canvasVisible || scrolling) return;
    onDraw(time, theme);
  });

  const stopSharedAnimationFrame = () => {
    if (!unsubscribeAnimationFrame) return;
    const unsubscribe = unsubscribeAnimationFrame;
    unsubscribeAnimationFrame = null;
    unsubscribe();
  };

  const resize = () => {
    onResize(getCanvasSize(canvas, pixelRatioCap));
  };

  const resumeIfActive = (reason) => {
    if (stopped || document.hidden || !canvasVisible || scrolling) return;
    onResume?.();
    queueFrame(reason);
  };

  const finishScrolling = () => {
    if (scrollResumeTimer !== null) window.clearTimeout(scrollResumeTimer);
    scrollResumeTimer = null;
    if (!scrolling) return;
    scrolling = false;
    resumeIfActive("contour-scroll-end");
  };

  const onScroll = () => {
    if (!scrolling) {
      scrolling = true;
      onPause?.();
    }
    if (supportsScrollEnd) return;
    if (scrollResumeTimer !== null) window.clearTimeout(scrollResumeTimer);
    scrollResumeTimer = window.setTimeout(finishScrolling, 120);
  };

  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
  } else {
    window.addEventListener("resize", resize, { passive: true });
  }

  if (typeof MutationObserver !== "undefined") {
    themeObserver = new MutationObserver(() => {
      theme = getTheme();
      onThemeChange?.(theme);
    });
    themeObserver.observe(document.documentElement, {
      attributeFilter: ["data-theme"],
      attributes: true,
    });
  }

  const visibilityObserver = typeof IntersectionObserver === "undefined"
    ? null
    : new IntersectionObserver(([entry]) => {
      canvasVisible = entry.isIntersecting;
      if (canvasVisible) {
        resumeIfActive("contour-visible");
      } else {
        onPause?.();
      }
    }, { rootMargin: "100% 0px 100% 0px" });
  visibilityObserver?.observe(canvas);

  const onVisibilityChange = () => {
    if (document.hidden) {
      onPause?.();
      return;
    }
    resumeIfActive("contour-resume");
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  if (pauseDuringScroll) {
    window.addEventListener("scroll", onScroll, { passive: true });
    if (supportsScrollEnd) window.addEventListener("scrollend", finishScrolling, { passive: true });
  }
  resize();

  const cleanup = () => {
    stopped = true;
    if (scrollResumeTimer !== null) window.clearTimeout(scrollResumeTimer);
    stopSharedAnimationFrame();
    visibilityObserver?.disconnect();
    resizeObserver?.disconnect();
    themeObserver?.disconnect();
    window.removeEventListener("resize", resize);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("scrollend", finishScrolling);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };

  cleanup.stopSharedAnimationFrame = stopSharedAnimationFrame;
  return cleanup;
}

let currentPointerX = 0.5;
let currentPointerY = 0.5;

function mountMainThreadFallback(canvas, scheduler, quality, sceneName) {
  const onPointerMove = (e) => {
    currentPointerX = e.clientX / window.innerWidth;
    currentPointerY = e.clientY / window.innerHeight;
  };
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  const renderer = createContourRenderer(canvas, quality);
  canvas.dataset.contourRenderer = "main";
  canvas.dataset.contourQuality = quality;
  markMotionScene(sceneName, "main-fallback");

  const stopLoop = createSharedContourLoop({
    canvas,
    onDraw: (time, theme) => {
      renderer.setTheme(theme);
      renderer.setPointer(currentPointerX, currentPointerY);
      const startedAt = shouldRecordMotionPerformance ? performance.now() : 0;
      if (renderer.draw(time)) {
        if (shouldRecordMotionPerformance) {
          recordMotionSceneUpdate(sceneName, performance.now() - startedAt);
        }
      }
    },
    onResize: ({ height, ratio, width }) => renderer.resize(width, height, ratio),
    pauseDuringScroll: quality === "mobile",
    queueFrame: scheduler.queueFrame,
    pixelRatioCap: getPixelRatioCap(quality, false),
    sceneName,
    subscribeAnimationFrame: scheduler.subscribeAnimationFrame,
  });

  return () => {
    window.removeEventListener("pointermove", onPointerMove);
    stopLoop();
  };
}

function supportsOffscreenCanvas(canvas) {
  return typeof Worker !== "undefined"
    && typeof OffscreenCanvas !== "undefined"
    && typeof canvas.transferControlToOffscreen === "function";
}

function mountWorker(canvas, scheduler, quality, sceneName) {
  const worker = new Worker(`${import.meta.env.BASE_URL}contour-worker.js`, { type: "module" });
  const offscreen = canvas.transferControlToOffscreen();
  const pixelRatioCap = getPixelRatioCap(quality, true);
  const initialSize = getCanvasSize(canvas, pixelRatioCap);
  let workerOwnsFrameLoop = false;
  const workerTheme = getTheme();
  let stopLoop = null;
  canvas.dataset.contourRenderer = "worker";
  canvas.dataset.contourQuality = quality;

  const onPointerMove = (e) => {
    currentPointerX = e.clientX / window.innerWidth;
    currentPointerY = e.clientY / window.innerHeight;
    worker.postMessage({ type: "pointer", x: currentPointerX, y: currentPointerY });
  };
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  worker.postMessage({
    canvas: offscreen,
    height: initialSize.height,
    quality,
    ratio: initialSize.ratio,
    theme: workerTheme,
    type: "init",
    width: initialSize.width,
    x: currentPointerX,
    y: currentPointerY,
  }, [offscreen]);

  worker.addEventListener("message", (event) => {
    if (event.data?.type !== "ready") return;
    workerOwnsFrameLoop = Boolean(event.data.animationLoop);
    if (workerOwnsFrameLoop) stopLoop?.stopSharedAnimationFrame();
  });
  const cleanup = () => {
    window.removeEventListener("pointermove", onPointerMove);
    stopLoop?.();
    worker.terminate();
  };
  worker.addEventListener("error", () => {
    markMotionScene(sceneName, "worker-error");
    cleanup();
  }, { once: true });
  markMotionScene(sceneName, "worker");

  stopLoop = createSharedContourLoop({
    canvas,
    onDraw: (time) => {
      if (!workerOwnsFrameLoop) worker.postMessage({ time, type: "draw", x: currentPointerX, y: currentPointerY });
    },
    onPause: () => worker.postMessage({ type: "pause" }),
    onResize: ({ height, ratio, width }) => worker.postMessage({ height, ratio, type: "resize", width }),
    onResume: () => worker.postMessage({ type: "resume" }),
    onThemeChange: (theme) => worker.postMessage({ theme, type: "theme" }),
    pauseDuringScroll: quality === "mobile",
    queueFrame: scheduler.queueFrame,
    pixelRatioCap,
    sceneName,
    subscribeAnimationFrame: scheduler.subscribeAnimationFrame,
  });
  if (workerOwnsFrameLoop) stopLoop.stopSharedAnimationFrame();

  return () => {
    window.removeEventListener("pointermove", onPointerMove);
    stopLoop();
    worker.terminate();
  };
}

function releaseContourMount(canvas, mount) {
  mount.references -= 1;
  if (mount.references > 0 || mount.disposeTimer !== null) return;

  // StrictMode cleanup/mount runs synchronously in development. Delaying one
  // task lets the remount retain the transferred canvas instead of falling
  // back to a main-thread renderer.
  mount.disposeTimer = window.setTimeout(() => {
    mount.disposeTimer = null;
    if (mount.references > 0) return;
    mount.cleanup();
    delete canvas.dataset.contourRenderer;
    delete canvas.dataset.contourQuality;
    contourMounts.delete(canvas);
  }, 0);
}

/**
 * Worker la fast path tren ca dev va production. Cache theo canvas giu cho
 * StrictMode khong transfer mot canvas hai lan, fallback van dung scheduler
 * chung khi browser khong co OffscreenCanvas.
 */
export function mountContourRenderer(canvas, scheduler, options = {}) {
  let mount = contourMounts.get(canvas);
  if (mount) {
    mount.references += 1;
    if (mount.disposeTimer !== null) {
      window.clearTimeout(mount.disposeTimer);
      mount.disposeTimer = null;
    }
    return () => releaseContourMount(canvas, mount);
  }

  const quality = getContourQuality();
  const sceneName = options.sceneName || "page-contour";
  let cleanup;
  if (!supportsOffscreenCanvas(canvas)) {
    cleanup = mountMainThreadFallback(canvas, scheduler, quality, sceneName);
  } else {
    try {
      cleanup = mountWorker(canvas, scheduler, quality, sceneName);
    } catch {
      cleanup = mountMainThreadFallback(canvas, scheduler, quality, sceneName);
    }
  }

  mount = { cleanup, disposeTimer: null, references: 1 };
  contourMounts.set(canvas, mount);
  return () => releaseContourMount(canvas, mount);
}
