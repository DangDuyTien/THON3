import { useCallback, useEffect, useRef, useState } from "react";
import RevealLine from "./RevealLine.jsx";

function areAncestorsVisible(element) {
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    const styles = window.getComputedStyle(parent);
    if (styles.display === "none" || styles.visibility === "hidden" || Number(styles.opacity) === 0) return false;
    parent = parent.parentElement;
  }
  return true;
}

function getLineBreaks(element, text) {
  const range = document.createRange();
  range.selectNodeContents(element);
  const firstRect = range.getClientRects()[0];
  const textNode = element.firstChild;
  if (!firstRect || !textNode || textNode.nodeType !== Node.TEXT_NODE) return [text];

  const lines = [];
  let start = 0;
  let previousTop = firstRect.top;

  for (let offset = 1; offset <= text.length; offset += 1) {
    range.setStart(textNode, start);
    range.setEnd(textNode, offset);
    const rects = Array.from(range.getClientRects());
    const rect = rects[rects.length - 1];
    if (rect && Math.abs(rect.top - previousTop) > 1) {
      lines.push(text.slice(start, offset - 1));
      start = offset - 1;
      previousTop = rect.top;
    }
  }

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
    setLines(getLineBreaks(measureRef.current, children));
  }, [children]);

  useEffect(() => {
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (observer && measureRef.current) observer.observe(measureRef.current);
    document.fonts?.ready?.then(measure);
    return () => observer?.disconnect();
  }, [measure]);

  useEffect(() => {
    const element = rootRef.current;
    if (!element || !enabled) return undefined;
    let revealTimer = null;
    let doneTimer = null;
    let visibilityFrame = null;
    let isIntersecting = false;
    let started = false;

    const startReveal = () => {
      if (started || !isIntersecting) return;
      if (!areAncestorsVisible(element)) {
        visibilityFrame = window.requestAnimationFrame(startReveal);
        return;
      }
      started = true;
      revealTimer = window.setTimeout(() => setIsRevealed(true), delay);
      doneTimer = window.setTimeout(() => setIsDone(true), delay + (lines.length - 1) * stagger + 3350);
      observer.unobserve(element);
    };

    const observer = new IntersectionObserver(([entry]) => {
      isIntersecting = entry.isIntersecting;
      if (isIntersecting) startReveal();
    }, { threshold: 0.12 });
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (revealTimer !== null) window.clearTimeout(revealTimer);
      if (doneTimer !== null) window.clearTimeout(doneTimer);
      if (visibilityFrame !== null) window.cancelAnimationFrame(visibilityFrame);
    };
  }, [delay, enabled, lines.length, stagger]);

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
