import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import {
  destroyMotionRuntime,
  initMotionRuntime,
  registerScene,
} from "../motion-runtime.js";
import { queueMotionFrame, subscribeContinuousFrame } from "../motion-frame-scheduler.js";
import { getPerformanceProfile, PERFORMANCE_PROFILE } from "../perf-profile.js";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

export function useMomentumScroll(reducedMotion) {
  useEffect(() => {
    initMotionRuntime({ scheduleUpdate: queueMotionFrame });

    if (reducedMotion) {
      return () => destroyMotionRuntime();
    }

    const lenis = new Lenis({
      anchors: true,
      autoRaf: true,
      duration: 1.6,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      overscroll: false,
      smoothWheel: true,
      syncTouch: false,
      touchInertiaMultiplier: 1.2,
      wheelMultiplier: 0.9,
    });

    const onLenisScroll = () => {
      queueMotionFrame("scroll");
    };

    const unsubscribeScroll = lenis.on("scroll", onLenisScroll);

    return () => {
      unsubscribeScroll();
      lenis.destroy();
      destroyMotionRuntime();
    };
  }, [reducedMotion]);
}

function applyReducedProgress(onProgressRef, reducedValue, entryProgress) {
  onProgressRef.current(
    reducedValue,
    0,
    { height: window.innerHeight, isCompact: window.innerWidth <= 680, width: window.innerWidth },
    { entryProgress },
  );
}

export function useSectionProgress(sectionRef, reducedMotion, onProgress, reducedValue = 0, options) {
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    if (reducedMotion) {
      applyReducedProgress(onProgressRef, reducedValue, 1);
      return undefined;
    }

    const cleanup = registerScene(
      section,
      "section",
      (progress, velocity, viewport, metadata) => onProgressRef.current(progress, velocity, viewport, metadata),
      reducedValue,
      options,
    );
    queueMotionFrame();
    return cleanup;
  }, [reducedMotion, reducedValue, sectionRef]);
}

export function useViewportEntryProgress(sectionRef, reducedMotion, onProgress, reducedValue = 1, options) {
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    if (reducedMotion) {
      applyReducedProgress(onProgressRef, reducedValue, reducedValue);
      return undefined;
    }

    const cleanup = registerScene(
      section,
      "viewport-entry",
      (progress, velocity, viewport, metadata) => onProgressRef.current(progress, velocity, viewport, metadata),
      reducedValue,
      options,
    );
    queueMotionFrame();
    return cleanup;
  }, [reducedMotion, reducedValue, sectionRef]);
}
