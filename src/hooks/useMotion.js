import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import {
  destroyMotionRuntime,
  initMotionRuntime,
  registerScene,
} from "../motion-runtime.js";
import { queueMotionFrame, subscribeContinuousFrame } from "../motion-frame-scheduler.js";

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

    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const compactViewport = window.matchMedia("(max-width: 680px)").matches;
    const maximumWheelDelta = compactViewport ? 120 : 240;
    const root = document.documentElement;
    let scrollEndTimer = null;
    let lenis;
    lenis = new Lenis({
      allowNestedScroll: false,
      anchors: true,
      autoRaf: false,
      duration: compactViewport ? 1.1 : 1.05,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      overscroll: false,
      smoothWheel: true,
      syncTouch: coarsePointer,
      syncTouchLerp: 0.09,
      touchInertiaExponent: 1.3,
      touchMultiplier: coarsePointer ? 0.7 : 1,
      virtualScroll: (data) => {
        data.deltaX = Math.sign(data.deltaX) * Math.min(Math.abs(data.deltaX), maximumWheelDelta);
        data.deltaY = Math.sign(data.deltaY) * Math.min(Math.abs(data.deltaY), maximumWheelDelta);
        return true;
      },
      wheelMultiplier: compactViewport ? 0.6 : 0.58,
    });
    let unsubscribeAnimationFrame = null;

    const stopAnimation = () => {
      unsubscribeAnimationFrame?.();
      unsubscribeAnimationFrame = null;
    };

    const animate = (time) => {
      lenis.raf(time);
      if (!lenis.isScrolling) stopAnimation();
    };

    const startAnimation = () => {
      if (document.hidden || unsubscribeAnimationFrame) return;
      unsubscribeAnimationFrame = subscribeContinuousFrame(animate);
    };

    const onVisibilityChange = () => {
      if (document.hidden) stopAnimation();
      else if (lenis.isScrolling === "smooth") startAnimation();
    };

    const onLenisScroll = () => {
      if (coarsePointer) {
        root.classList.add("native-scroll-active");
        if (scrollEndTimer !== null) window.clearTimeout(scrollEndTimer);
        scrollEndTimer = window.setTimeout(() => {
          scrollEndTimer = null;
          root.classList.remove("native-scroll-active");
        }, 120);
      }
      queueMotionFrame("scroll");
      if (lenis.isScrolling === "smooth") startAnimation();
    };

    const unsubscribeScroll = lenis.on("scroll", onLenisScroll);
    const unsubscribeVirtualScroll = lenis.on("virtual-scroll", startAnimation);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("click", startAnimation, true);

    return () => {
      if (scrollEndTimer !== null) window.clearTimeout(scrollEndTimer);
      stopAnimation();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("click", startAnimation, true);
      unsubscribeScroll();
      unsubscribeVirtualScroll();
      lenis.destroy();
      root.classList.remove("native-scroll-active");
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
