const intersectionCallbacks = new Map();
const resizeCallbacks = new Map();
const visibilityCallbacks = new Map();

let intersectionObserver = null;
let resizeObserver = null;
let visibilityFrame = null;

function getIntersectionObserver() {
  if (intersectionObserver || typeof IntersectionObserver === "undefined") return intersectionObserver;

  intersectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => intersectionCallbacks.get(entry.target)?.(entry.isIntersecting));
  }, { threshold: 0.12 });

  return intersectionObserver;
}

function getResizeObserver() {
  if (resizeObserver || typeof ResizeObserver === "undefined") return resizeObserver;

  resizeObserver = new ResizeObserver((entries) => {
    entries.forEach((entry) => resizeCallbacks.get(entry.target)?.(entry));
  });

  return resizeObserver;
}

function areAncestorsVisible(element) {
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    const styles = window.getComputedStyle(parent);
    if (styles.display === "none" || styles.visibility === "hidden" || Number(styles.opacity) === 0) return false;
    parent = parent.parentElement;
  }
  return true;
}

function flushVisibilityCallbacks() {
  visibilityFrame = null;

  visibilityCallbacks.forEach((callback, element) => {
    if (!element.isConnected) {
      visibilityCallbacks.delete(element);
      return;
    }
    if (!areAncestorsVisible(element)) return;
    visibilityCallbacks.delete(element);
    callback();
  });

  if (visibilityCallbacks.size) {
    visibilityFrame = window.requestAnimationFrame(flushVisibilityCallbacks);
  }
}

export function observeRevealIntersection(element, callback) {
  const observer = getIntersectionObserver();
  if (!observer) {
    callback(true);
    return () => {};
  }

  intersectionCallbacks.set(element, callback);
  observer.observe(element);

  return () => {
    observer.unobserve(element);
    intersectionCallbacks.delete(element);
    if (!intersectionCallbacks.size) {
      observer.disconnect();
      intersectionObserver = null;
    }
  };
}

export function observeRevealResize(element, callback) {
  const observer = getResizeObserver();
  if (!observer) return () => {};

  resizeCallbacks.set(element, callback);
  observer.observe(element);

  return () => {
    observer.unobserve(element);
    resizeCallbacks.delete(element);
    if (!resizeCallbacks.size) {
      observer.disconnect();
      resizeObserver = null;
    }
  };
}

export function waitForRevealVisibility(element, callback) {
  if (areAncestorsVisible(element)) {
    callback();
    return () => {};
  }

  visibilityCallbacks.set(element, callback);
  if (visibilityFrame === null) {
    visibilityFrame = window.requestAnimationFrame(flushVisibilityCallbacks);
  }

  return () => {
    visibilityCallbacks.delete(element);
    if (!visibilityCallbacks.size && visibilityFrame !== null) {
      window.cancelAnimationFrame(visibilityFrame);
      visibilityFrame = null;
    }
  };
}
