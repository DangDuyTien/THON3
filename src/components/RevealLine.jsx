import React, { useEffect, useRef, useState } from "react";
import { observeRevealIntersection, waitForRevealVisibility } from "../reveal-observers.js";

export default function RevealLine({ children, direction = "right", className = "", delay = 0, enabled = true }) {
  const lineRef = useRef(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const el = lineRef.current;
    if (!el || !enabled) return undefined;

    let revealTimer = null;
    let stopWaitingForVisibility = null;
    let stopObserving = null;
    let started = false;

    const finishReveal = (event) => {
      if (event.target !== el || event.pseudoElement !== "::after") return;
      setIsDone(true);
      el.classList.add("is-revealed-done");
    };

    const reveal = () => {
      if (started) return;
      started = true;
      stopObserving?.();
      stopObserving = null;
      if (delay > 0) revealTimer = window.setTimeout(() => setIsRevealed(true), delay);
      else setIsRevealed(true);
    };

    el.addEventListener("animationend", finishReveal);
    stopObserving = observeRevealIntersection(el, (isIntersecting) => {
      stopWaitingForVisibility?.();
      stopWaitingForVisibility = null;
      if (isIntersecting) stopWaitingForVisibility = waitForRevealVisibility(el, reveal);
    });

    return () => {
      el.removeEventListener("animationend", finishReveal);
      stopObserving?.();
      stopWaitingForVisibility?.();
      if (revealTimer !== null) window.clearTimeout(revealTimer);
    };
  }, [delay, enabled]);

  return (
    <span
      ref={lineRef}
      className={`reveal-line${isRevealed ? " is-revealed" : ""}${isDone ? " is-revealed-done" : ""}${className ? ` ${className}` : ""}`}
      data-reveal-direction={direction}
    >
      <span className="reveal-line-copy">{children}</span>
    </span>
  );
}
