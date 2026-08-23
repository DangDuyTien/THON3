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

    const compactOrTouch = window.matchMedia("(pointer: coarse), (max-width: 680px)").matches;
    const maximumTargetLead = window.innerHeight * 0.72;
    const maximumWheelDelta = compactOrTouch ? 120 : 240;
    let lenis;
    lenis = new Lenis({
      allowNestedScroll: true,
      anchors: true,
      autoRaf: false,
      duration: compactOrTouch ? 1.2 : 1.1,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      overscroll: false,
      smoothWheel: true,
      syncTouch: compactOrTouch,
      syncTouchLerp: 0.09,
      touchInertiaExponent: 1.22,
      touchMultiplier: 0.74,
      virtualScroll: (data) => {
        const isTouch = data.event.type.includes("touch");
        const maximumDelta = isTouch ? 112 : maximumWheelDelta;
        data.deltaX = Math.sign(data.deltaX) * Math.min(Math.abs(data.deltaX), maximumDelta);
        data.deltaY = Math.sign(data.deltaY) * Math.min(Math.abs(data.deltaY), maximumDelta);
        const targetLead = lenis.targetScroll - lenis.animatedScroll;
        if (!isTouch && Math.sign(targetLead) === Math.sign(data.deltaY)) {
          const remainingLead = Math.max(maximumTargetLead - Math.abs(targetLead), 0);
          data.deltaY = Math.sign(data.deltaY) * Math.min(Math.abs(data.deltaY), remainingLead);
        }
        return true;
      },
      wheelMultiplier: 0.55,
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
      queueMotionFrame("scroll");
      if (lenis.isScrolling === "smooth") startAnimation();
    };

    const unsubscribeScroll = lenis.on("scroll", onLenisScroll);
    const unsubscribeVirtualScroll = lenis.on("virtual-scroll", startAnimation);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("click", startAnimation, true);

    return () => {
      stopAnimation();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("click", startAnimation, true);
      unsubscribeScroll();
      unsubscribeVirtualScroll();
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
