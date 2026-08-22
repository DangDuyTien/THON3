/**
 * Runtime duy nhat cho motion scene.
 *
 * Scroll frame chi doc geometry cache va goi update cho scene ACTIVE. Geometry
 * duoc cap nhat boi ResizeObserver/IntersectionObserver, khong do layout trong
 * luc cuon binh thuong.
 */

import { markMotionScene, recordActiveMotionLayers, recordMotionSceneUpdate } from "./perf-hooks.js";

export const MOTION_SCENE_STATE = Object.freeze({
  ACTIVE: "active",
  PREWARM: "prewarm",
  SLEEP: "sleep",
});

const geometryCache = new WeakMap();
const scenes = new Set();
const dirtyGeometry = new Set();

let activeObserver = null;
let documentResizeObserver = null;
let initialized = false;
let prewarmObserver = null;
let requestUpdate = null;
let resizeObserver = null;
let sceneSequence = 0;
let lastScrollY = 0;
let lastUpdateTime = 0;

function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function smoothStep(value) {
  const clamped = clamp(value);
  return clamped * clamped * (3 - 2 * clamped);
}

function getGeometry(element) {
  let geometry = geometryCache.get(element);
  if (!geometry) {
    geometry = {
      height: 0,
      ready: false,
      top: 0,
      travel: 1,
      viewportHeight: 0,
    };
    geometryCache.set(element, geometry);
  }
  return geometry;
}

function refreshGeometry(element) {
  if (!element?.isConnected) return;

  const geometry = getGeometry(element);
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight;

  geometry.height = Math.max(rect.height, element.offsetHeight, 1);
  geometry.top = rect.top + window.scrollY;
  geometry.travel = Math.max(geometry.height - viewportHeight, 1);
  geometry.viewportHeight = viewportHeight;
  geometry.ready = true;
}

function markGeometryDirty(element) {
  if (!element) return;
  dirtyGeometry.add(element);
  requestUpdate?.();
}

function markAllGeometryDirty() {
  for (const scene of scenes) dirtyGeometry.add(scene.element);
  requestUpdate?.();
}

function onWindowScroll() {
  requestUpdate?.("native-scroll");
}

function flushGeometryCache() {
  if (!dirtyGeometry.size) return;

  for (const element of dirtyGeometry) refreshGeometry(element);
  dirtyGeometry.clear();
}

function getWillChangeTargets(scene) {
  const targets = typeof scene.willChangeTargets === "function"
    ? scene.willChangeTargets()
    : scene.willChangeTargets;
  const targetList = Array.isArray(targets) ? targets : targets ? [targets] : [];
  const validTargets = targetList.filter(Boolean);
  return validTargets.length ? validTargets : [scene.element];
}

function applyWillChange(scene) {
  if (!scene.willChange) return;
  scene.appliedWillChangeTargets = getWillChangeTargets(scene);
  for (const element of scene.appliedWillChangeTargets) element.style.willChange = scene.willChange;
}

function clearWillChange(scene) {
  if (!scene.willChange) return;
  const targets = scene.appliedWillChangeTargets?.length
    ? scene.appliedWillChangeTargets
    : getWillChangeTargets(scene);
  for (const element of targets) element.style.willChange = "";
  scene.appliedWillChangeTargets = [];
}

function updateActiveLayerCount() {
  const targets = new Set();
  for (const scene of scenes) {
    if (scene.state !== MOTION_SCENE_STATE.ACTIVE || !scene.willChange) continue;
    const sceneTargets = scene.appliedWillChangeTargets?.length
      ? scene.appliedWillChangeTargets
      : getWillChangeTargets(scene);
    for (const element of sceneTargets) targets.add(element);
  }
  recordActiveMotionLayers(targets.size);
}

function invoke(scene, callbackName) {
  const callback = scene[callbackName];
  if (typeof callback === "function") callback();
}

function setSceneState(scene, nextState) {
  if (scene.state === nextState) return;

  const previousState = scene.state;

  if (previousState === MOTION_SCENE_STATE.ACTIVE) {
    invoke(scene, "deactivate");
    clearWillChange(scene);
    markMotionScene(scene.name, "deactivate");
  }

  if (nextState === MOTION_SCENE_STATE.SLEEP && previousState !== MOTION_SCENE_STATE.SLEEP) {
    invoke(scene, "sleep");
    markMotionScene(scene.name, "sleep");
  }

  if (previousState === MOTION_SCENE_STATE.SLEEP && nextState !== MOTION_SCENE_STATE.SLEEP) {
    invoke(scene, "prewarm");
    markMotionScene(scene.name, "prewarm");
  }

  scene.state = nextState;
  scene.lastEntryProgress = Number.NaN;
  scene.lastProgress = Number.NaN;

  if (nextState === MOTION_SCENE_STATE.ACTIVE) {
    applyWillChange(scene);
    invoke(scene, "activate");
    markMotionScene(scene.name, "activate");
    markGeometryDirty(scene.element);
  }

  updateActiveLayerCount();
}

function reconcileSceneState(scene) {
  const nextState = scene.isActive
    ? MOTION_SCENE_STATE.ACTIVE
    : scene.isPrewarmed
      ? MOTION_SCENE_STATE.PREWARM
      : MOTION_SCENE_STATE.SLEEP;
  setSceneState(scene, nextState);
}

function onPrewarmIntersection(entries) {
  for (const entry of entries) {
    for (const scene of scenes) {
      if (scene.element !== entry.target) continue;
      scene.isPrewarmed = entry.isIntersecting;
      markGeometryDirty(scene.element);
      reconcileSceneState(scene);
    }
  }
}

function onActiveIntersection(entries) {
  for (const entry of entries) {
    for (const scene of scenes) {
      if (scene.element !== entry.target) continue;
      scene.isActive = entry.isIntersecting;
      markGeometryDirty(scene.element);
      reconcileSceneState(scene);
    }
  }
}

function observeScene(scene) {
  resizeObserver?.observe(scene.element);
  prewarmObserver?.observe(scene.element);
  activeObserver?.observe(scene.element);
}

function unobserveScene(scene) {
  resizeObserver?.unobserve(scene.element);
  prewarmObserver?.unobserve(scene.element);
  activeObserver?.unobserve(scene.element);
}

/**
 * Dang ky mot scene.
 *
 * options.prewarm/activate/deactivate/sleep la lifecycle de scene quan ly media
 * va will-change. onProgress chi chay khi scene ACTIVE, tru scene khai bao
 * updateWhilePrewarmed cho motion vao viewport.
 */
export function registerScene(element, type, onProgress, reducedValue = 0, options = {}) {
  const scene = {
    activate: options.activate,
    deactivate: options.deactivate,
    element,
    isActive: false,
    isPrewarmed: false,
    lastEntryProgress: Number.NaN,
    lastProgress: Number.NaN,
    name: options.name || element.dataset.motionScene || element.id || `scene-${sceneSequence += 1}`,
    onProgress,
    prewarm: options.prewarm,
    reducedValue,
    sleep: options.sleep,
    state: MOTION_SCENE_STATE.SLEEP,
    type,
    updateWhilePrewarmed: options.updateWhilePrewarmed === true,
    willChange: options.willChange || "",
    willChangeTargets: options.willChangeTargets || null,
    appliedWillChangeTargets: [],
  };

  scenes.add(scene);
  markGeometryDirty(element);
  observeScene(scene);

  return () => {
    if (!scenes.delete(scene)) return;
    unobserveScene(scene);
    dirtyGeometry.delete(scene.element);

    if (scene.state === MOTION_SCENE_STATE.ACTIVE) invoke(scene, "deactivate");
    if (scene.state !== MOTION_SCENE_STATE.SLEEP) invoke(scene, "sleep");
    clearWillChange(scene);
    updateActiveLayerCount();
    markMotionScene(scene.name, "destroy");
    geometryCache.delete(scene.element);
  };
}

function getProgress(scene, scrollY, viewportHeight) {
  const geometry = getGeometry(scene.element);
  if (!geometry.ready) return null;

  const elementTop = geometry.top - scrollY;

  if (scene.type === "section") {
    const elementBottom = elementTop + geometry.height;
    if (elementBottom <= 0) return 1;
    if (elementTop >= viewportHeight) return 0;
    return clamp(-elementTop / geometry.travel);
  }

  const start = viewportHeight * 0.96;
  const end = viewportHeight * 0.22;
  if (elementTop >= start) return 0;
  if (elementTop <= end) return 1;
  return smoothStep((start - elementTop) / Math.max(start - end, 1));
}

function getViewportEntryProgress(scene, scrollY, viewportHeight) {
  const geometry = getGeometry(scene.element);
  if (!geometry.ready) return 0;

  const start = viewportHeight * 0.96;
  const end = viewportHeight * 0.22;
  const elementTop = geometry.top - scrollY;
  if (elementTop >= start) return 0;
  if (elementTop <= end) return 1;
  return smoothStep((start - elementTop) / Math.max(start - end, 1));
}

/**
 * Goi tu scroll scheduler chung cua App. Khong co layout read trong duong nay
 * tru khi observer vua danh dau geometry can refresh do resize/noi dung doi.
 */
export function updateAllScenes() {
  flushGeometryCache();

  const now = performance.now();
  const scrollY = window.scrollY;
  const viewport = {
    height: window.innerHeight,
    isCompact: window.innerWidth <= 680,
    width: window.innerWidth,
  };
  const elapsed = Math.max(now - lastUpdateTime, 1);
  const velocity = lastUpdateTime ? ((scrollY - lastScrollY) / elapsed) * 1000 : 0;
  lastScrollY = scrollY;
  lastUpdateTime = now;

  for (const scene of scenes) {
    const canUpdate = scene.state === MOTION_SCENE_STATE.ACTIVE
      || (scene.state === MOTION_SCENE_STATE.PREWARM && scene.updateWhilePrewarmed);
    if (!canUpdate) continue;

    const progress = getProgress(scene, scrollY, viewport.height);
    if (progress === null) continue;
    const entryProgress = getViewportEntryProgress(scene, scrollY, viewport.height);
    const progressUnchanged = Number.isFinite(scene.lastProgress)
      && Math.abs(progress - scene.lastProgress) < 0.0001;
    const entryUnchanged = !scene.updateWhilePrewarmed
      || (Number.isFinite(scene.lastEntryProgress)
        && Math.abs(entryProgress - scene.lastEntryProgress) < 0.0001);
    if (progressUnchanged && entryUnchanged) {
      continue;
    }

    scene.lastProgress = progress;
    scene.lastEntryProgress = entryProgress;
    const startedAt = performance.now();
    scene.onProgress(progress, velocity, viewport, {
      entryProgress,
    });
    recordMotionSceneUpdate(scene.name, performance.now() - startedAt);
  }

}

/**
 * scheduleUpdate phai la shared scroll scheduler cua App. Khong tao them mot
 * vong requestAnimationFrame rieng cho runtime.
 */
export function initMotionRuntime({ scheduleUpdate } = {}) {
  requestUpdate = scheduleUpdate || requestUpdate;
  if (initialized) return updateAllScenes;

  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) markGeometryDirty(entry.target);
  });
  documentResizeObserver = new ResizeObserver(markAllGeometryDirty);
  documentResizeObserver.observe(document.documentElement);

  prewarmObserver = new IntersectionObserver(onPrewarmIntersection, {
    rootMargin: "120% 0px 120% 0px",
    threshold: 0,
  });
  activeObserver = new IntersectionObserver(onActiveIntersection, {
    rootMargin: "0px",
    threshold: 0,
  });

  for (const scene of scenes) observeScene(scene);
  window.addEventListener("scroll", onWindowScroll, { passive: true });
  window.addEventListener("resize", markAllGeometryDirty, { passive: true });
  initialized = true;
  markAllGeometryDirty();
  return updateAllScenes;
}

export function destroyMotionRuntime() {
  if (!initialized && !scenes.size) return;

  for (const scene of scenes) {
    if (scene.state === MOTION_SCENE_STATE.ACTIVE) invoke(scene, "deactivate");
    if (scene.state !== MOTION_SCENE_STATE.SLEEP) invoke(scene, "sleep");
    clearWillChange(scene);
    markMotionScene(scene.name, "destroy");
  }

  resizeObserver?.disconnect();
  documentResizeObserver?.disconnect();
  prewarmObserver?.disconnect();
  activeObserver?.disconnect();
  window.removeEventListener("scroll", onWindowScroll);
  window.removeEventListener("resize", markAllGeometryDirty);

  resizeObserver = null;
  documentResizeObserver = null;
  prewarmObserver = null;
  activeObserver = null;
  dirtyGeometry.clear();
  scenes.clear();
  recordActiveMotionLayers(0);
  initialized = false;
  lastScrollY = 0;
  lastUpdateTime = 0;
  requestUpdate = null;
}
