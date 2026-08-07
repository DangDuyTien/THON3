import React, { useEffect, useRef, useState } from "react";

function areAncestorsVisible(element) {
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    const styles = window.getComputedStyle(parent);
    if (styles.display === "none" || styles.visibility === "hidden" || Number(styles.opacity) === 0) return false;
    parent = parent.parentElement;
  }
  return true;
}

export default function RevealLine({ children, direction = "right", className = "", delay = 0, enabled = true }) {
  const lineRef = useRef(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const el = lineRef.current;
    if (!el || !enabled) return undefined;

    let revealTimer = null;
    let doneTimer = null;
    let visibilityFrame = null;
    let isIntersecting = false;
    let started = false;

    const startReveal = () => {
      if (started || !isIntersecting) return;
      if (!areAncestorsVisible(el)) {
        visibilityFrame = window.requestAnimationFrame(startReveal);
        return;
      }
      started = true;
      revealTimer = window.setTimeout(() => {
        setIsRevealed(true);
        doneTimer = window.setTimeout(() => setIsDone(true), 3350);
      }, delay);
      observer.unobserve(el);
    };

    const observer = new IntersectionObserver(([entry]) => {
      isIntersecting = entry.isIntersecting;
      if (isIntersecting) startReveal();
    }, { threshold: 0.12 });

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (revealTimer !== null) window.clearTimeout(revealTimer);
      if (doneTimer !== null) window.clearTimeout(doneTimer);
      if (visibilityFrame !== null) window.cancelAnimationFrame(visibilityFrame);
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
