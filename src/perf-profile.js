const LOW_MEMORY_GB = 4;
const LOW_CPU_CORES = 4;

export const PERFORMANCE_PROFILE = Object.freeze({
  STANDARD: "standard",
  LOW: "low",
});

function getReducedMotionPreference() {
  return typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

export function getPerformanceProfile() {
  if (typeof window === "undefined") return PERFORMANCE_PROFILE.STANDARD;

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const memory = Number(navigator.deviceMemory);
  const cores = Number(navigator.hardwareConcurrency);
  const highDpr = (window.devicePixelRatio || 1) >= 2;

  if (getReducedMotionPreference()) return PERFORMANCE_PROFILE.LOW;
  if (connection?.saveData === true) return PERFORMANCE_PROFILE.LOW;
  if (Number.isFinite(memory) && memory <= LOW_MEMORY_GB) return PERFORMANCE_PROFILE.LOW;
  if (Number.isFinite(cores) && cores <= LOW_CPU_CORES) return PERFORMANCE_PROFILE.LOW;
  // A high-DPR screen makes the fixed contour notably more expensive even
  // when the browser does not expose memory/CPU hints.
  if (highDpr && window.innerWidth <= 900) return PERFORMANCE_PROFILE.LOW;

  return PERFORMANCE_PROFILE.STANDARD;
}

export function getContinuousFrameCadence(profile = getPerformanceProfile()) {
  return profile === PERFORMANCE_PROFILE.LOW ? 2 : 1;
}
