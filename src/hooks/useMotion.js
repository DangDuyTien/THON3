import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import {
  destroyMotionRuntime,
  initMotionRuntime,
  registerScene,
} from "../motion-runtime.js";
import {
  queueMotionFrame,
  subscribeContinuousFrame,
} from "../motion-frame-scheduler.js";

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
      autoRaf: false,
      lerp: 0.058,
      overscroll: false,
      smoothWheel: true,
      stopInertiaOnNavigate: true,
      syncTouch: false,
      touchMultiplier: 1.1,
      wheelMultiplier: 0.72,
    });
    let unsubscribeAnimationFrame = null;

    const animate = (time) => {
      lenis.raf(time);
    };

    const startAnimation = () => {
      if (document.hidden || unsubscribeAnimationFrame) return;
      unsubscribeAnimationFrame = subscribeContinuousFrame(animate);
    };

    const stopAnimation = () => {
      if (!unsubscribeAnimationFrame) return;
      const unsubscribe = unsubscribeAnimationFrame;
      unsubscribeAnimationFrame = null;
      unsubscribe();
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stopAnimation();
      } else {
        startAnimation();
      }
    };

    const onLenisScroll = () => {
      queueMotionFrame("scroll");
    };

    const onAnchorClick = (event) => {
      if (event.target instanceof Element && event.target.closest('a[href^="#"]')) {
        startAnimation();
      }
    };

    const unsubscribeScroll = lenis.on("scroll", onLenisScroll);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("click", onAnchorClick, { passive: true });
    startAnimation();

    return () => {
      stopAnimation();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("click", onAnchorClick);
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
