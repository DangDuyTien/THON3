import { useCallback, useEffect, useRef, useState } from "react";
import RevealLine from "./RevealLine.jsx";
import { observeRevealIntersection, observeRevealResize, waitForRevealVisibility } from "../reveal-observers.js";

function getLineBreaks(element, text) {
  const range = document.createRange();
  const textNode = element.firstChild;
  const words = Array.from(text.matchAll(/\S+/g));
  if (!words.length || !textNode || textNode.nodeType !== Node.TEXT_NODE) return [text];

  const lines = [];
  let start = 0;
  let previousTop = null;

  words.forEach((word) => {
    const wordStart = word.index;
    range.setStart(textNode, wordStart);
    range.setEnd(textNode, wordStart + word[0].length);
    const rect = range.getClientRects()[0];
    if (!rect) return;
    if (previousTop !== null && Math.abs(rect.top - previousTop) > 1) {
      lines.push(text.slice(start, wordStart));
      start = wordStart;
    }
    previousTop = rect.top;
  });

  lines.push(text.slice(start));
  return lines.filter((line, index) => line || index === lines.length - 1);
}

function VisualRevealLines({ children, direction, className, delay, stagger, enabled }) {
  const rootRef = useRef(null);
  const measureRef = useRef(null);
  const [lines, setLines] = useState([children]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const measure = useCallback(() => {
    if (!measureRef.current) return;
    const nextLines = getLineBreaks(measureRef.current, children);
    setLines((currentLines) => (
      currentLines.length === nextLines.length
      && currentLines.every((line, index) => line === nextLines[index])
        ? currentLines
        : nextLines
    ));
  }, [children]);

  useEffect(() => {
    measure();
    const stopObservingResize = measureRef.current
      ? observeRevealResize(measureRef.current, measure)
      : () => {};
    document.fonts?.ready?.then(measure);
    return stopObservingResize;
  }, [measure]);

  useEffect(() => {
    const element = rootRef.current;
    if (!element || !enabled) return undefined;
    let revealTimer = null;
    let stopWaitingForVisibility = null;
    let stopObserving = null;
    let started = false;

    const finishReveal = (event) => {
      if (event.pseudoElement !== "::after" || !event.target.classList.contains("reveal-line")) return;
      event.target.classList.add("is-revealed-done");
      const revealLines = element.querySelectorAll(".reveal-line");
      if (Array.from(revealLines).every((line) => line.classList.contains("is-revealed-done"))) {
        setIsDone(true);
      }
    };

    const reveal = () => {
      if (started) return;
      started = true;
      stopObserving?.();
      stopObserving = null;
      if (delay > 0) revealTimer = window.setTimeout(() => setIsRevealed(true), delay);
      else setIsRevealed(true);
    };

    element.addEventListener("animationend", finishReveal);
    stopObserving = observeRevealIntersection(element, (isIntersecting) => {
      stopWaitingForVisibility?.();
      stopWaitingForVisibility = null;
      if (isIntersecting) stopWaitingForVisibility = waitForRevealVisibility(element, reveal);
    });

    return () => {
      element.removeEventListener("animationend", finishReveal);
      stopObserving?.();
      stopWaitingForVisibility?.();
      if (revealTimer !== null) window.clearTimeout(revealTimer);
    };
  }, [delay, enabled]);

  return (
    <span className={`reveal-lines${className ? ` ${className}` : ""}`} ref={rootRef}>
      <span className="reveal-lines-measure" ref={measureRef} aria-hidden="true">{children}</span>
      <span className="reveal-lines-rendered">
        {lines.map((line, index) => (
          <span
            className={`reveal-line${isRevealed ? " is-revealed" : ""}${isDone ? " is-revealed-done" : ""}`}
            data-reveal-direction={direction}
            key={`${line}-${index}`}
            style={{ "--wipe-stagger-delay": `${index * stagger}ms` }}
          >
            <span className="reveal-line-copy">{line}</span>
          </span>
        ))}
      </span>
    </span>
  );
}

export default function RevealLines({ children, direction = "right", className = "", delay = 0, stagger = 180, enabled = true }) {
  if (typeof children !== "string") {
    return <RevealLine direction={direction} className={className} delay={delay} enabled={enabled}>{children}</RevealLine>;
  }
  return <VisualRevealLines children={children} direction={direction} className={className} delay={delay} stagger={stagger} enabled={enabled} />;
}
