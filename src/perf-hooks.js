const motionMetrics = {
  dynamicLayerCount: 0,
  dynamicLayerPeak: 0,
  sceneUpdates: {},
};

const isDev = import.meta.env.DEV;

function getPerformanceBudget() {
  const compact = window.matchMedia?.("(max-width: 680px)").matches;
  return {
    dynamicLayers: compact ? 8 : 12,
    sceneUpdateMs: compact ? 6 : 4,
  };
}

export function markMotionScene(sceneName, phase) {
  if (!sceneName || typeof performance === "undefined") return;

  performance.mark?.(`motion:${sceneName}:${phase}`);
}

export function recordMotionSceneUpdate(sceneName, duration) {
  if (!sceneName || !Number.isFinite(duration)) return;

  const summary = motionMetrics.sceneUpdates[sceneName] || {
    calls: 0,
    longestMs: 0,
    totalMs: 0,
  };
  summary.calls += 1;
  summary.longestMs = Math.max(summary.longestMs, duration);
  summary.totalMs += duration;
  motionMetrics.sceneUpdates[sceneName] = summary;

  if (isDev && duration > getPerformanceBudget().sceneUpdateMs) {
    console.warn(`[perf] scene ${sceneName} took ${duration.toFixed(2)}ms`);
  }
}

export function recordActiveMotionLayers(count) {
  motionMetrics.dynamicLayerCount = count;
  motionMetrics.dynamicLayerPeak = Math.max(motionMetrics.dynamicLayerPeak, count);

  const overBudget = count > getPerformanceBudget().dynamicLayers;
  if (isDev && overBudget) {
    console.warn(`[perf] active motion layers ${count} exceed the budget`);
  }
}

export function getMotionMetrics() {
  return motionMetrics;
}
