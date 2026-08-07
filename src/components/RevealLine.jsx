import React, { useEffect, useRef, useState } from "react";

export default function RevealLine({ children, direction = "right", className = "", delay = 0 }) {
  const lineRef = useRef(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const el = lineRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setIsRevealed(true);
              setTimeout(() => {
                setIsDone(true);
              }, 3350);
            }, delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [delay]);

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
