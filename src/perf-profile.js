const LOW_MEMORY_GB = 2;
const LOW_CPU_CORES = 2;

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

  if (getReducedMotionPreference()) return PERFORMANCE_PROFILE.LOW;
  if (connection?.saveData === true) return PERFORMANCE_PROFILE.LOW;
  if (Number.isFinite(memory) && memory < LOW_MEMORY_GB) return PERFORMANCE_PROFILE.LOW;
  if (Number.isFinite(cores) && cores < LOW_CPU_CORES) return PERFORMANCE_PROFILE.LOW;

  return PERFORMANCE_PROFILE.STANDARD;
}

export function getContinuousFrameCadence() {
  return 1;
}
