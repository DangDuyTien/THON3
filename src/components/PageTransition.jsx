import { useEffect, useRef, useState } from "react";
import { getRouteKeyForHref, getTransitionTitle, isTransitionNavigation } from "../route-transition.js";
import { LoaderMark } from "./PageLoader.jsx";

const COVER_DURATION = 620;
const RETRACT_DURATION = 820;
const READY_TIMEOUT = 5000;

function toClipPath(progress, retracting = false) {
  const edge = Math.max(0, Math.min(100, progress));
  const bulge = retracting ? -Math.sin((edge / 100) * Math.PI) * 11 : Math.sin((edge / 100) * Math.PI) * 11;
  const curve = Math.max(0, Math.min(100, edge + bulge));
  return `M 0 0 L 100 0 L 100 ${edge} Q 50 ${curve} 0 ${edge} Z`;
}

function toObjectBoundingBoxPath(path) {
  return path.replace(/(-?\d+(?:\.\d+)?)/g, (value) => (Number(value) / 100).toFixed(4));
}

export default function PageTransition({ currentRouteKey, reducedMotion = false }) {
  const [phase, setPhase] = useState("idle");
  const [title, setTitle] = useState("");
  const [clipPath, setClipPath] = useState(toClipPath(0));
  const targetKeyRef = useRef("");
  const tokenRef = useRef(0);
  const rafRef = useRef(null);
  const timeoutRef = useRef(null);
  const focusRef = useRef(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const stopTimers = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    rafRef.current = null;
    timeoutRef.current = null;
  };

  const animate = (from, to, duration, nextPhase, token) => {
    stopTimers();
    const startedAt = performance.now();
    const frame = (now) => {
      if (tokenRef.current !== token) return;
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = progress < 1 ? 1 - Math.pow(1 - progress, 3) : 1;
      const value = from + (to - from) * eased;
      setClipPath(toClipPath(value, nextPhase === "retracting"));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        rafRef.current = null;
        if (nextPhase === "idle") {
          finish();
        } else {
          setPhase(nextPhase);
        }
      }
    };
    rafRef.current = requestAnimationFrame(frame);
  };

  const finish = () => {
    stopTimers();
    setClipPath(toClipPath(0));
    setPhase("idle");
    targetKeyRef.current = "";
    document.body.classList.remove("page-transition-active");
    document.documentElement.removeAttribute("aria-busy");
    const focusTarget = focusRef.current;
    focusRef.current = null;
    if (focusTarget?.isConnected) focusTarget.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (phase !== "waiting" || !targetKeyRef.current || currentRouteKey !== targetKeyRef.current) return undefined;
    const token = tokenRef.current;
    const frame = requestAnimationFrame(() => {
      if (tokenRef.current === token) {
        setPhase("retracting");
        animate(100, 0, reducedMotion ? 1 : RETRACT_DURATION, "idle", token);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [currentRouteKey, phase, reducedMotion]);

  useEffect(() => {
    if (phase !== "idle") return undefined;
    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!anchor || !isTransitionNavigation(anchor)) return;
      const destination = new URL(anchor.href, window.location.href);
      const destinationKey = getRouteKeyForHref(destination.href);
      if (!destinationKey || destinationKey === currentRouteKey) return;

      event.preventDefault();
      focusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      targetKeyRef.current = destinationKey;
      setTitle(getTransitionTitle(destination.href));
      document.body.classList.add("page-transition-active");
      document.documentElement.setAttribute("aria-busy", "true");
      const token = ++tokenRef.current;
      setPhase("covering");
      if (reducedMotion) {
        setClipPath(toClipPath(100));
        setPhase("waiting");
        window.history.pushState({}, "", `${destination.pathname}${destination.search}${destination.hash}`);
        window.dispatchEvent(new PopStateEvent("popstate"));
      } else {
        animate(0, 100, COVER_DURATION, "waiting", token);
        timeoutRef.current = window.setTimeout(() => {
          if (tokenRef.current !== token) return;
          window.history.pushState({}, "", `${destination.pathname}${destination.search}${destination.hash}`);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }, COVER_DURATION + 20);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [currentRouteKey, phase, reducedMotion]);

  useEffect(() => {
    if (phase === "waiting") {
      timeoutRef.current = window.setTimeout(finish, READY_TIMEOUT);
    }
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [phase]);

  useEffect(() => () => {
    tokenRef.current += 1;
    stopTimers();
    document.body.classList.remove("page-transition-active");
    document.documentElement.removeAttribute("aria-busy");
  }, []);

  if (phase === "idle") return null;

  return (
    <div className={`page-transition is-${phase}${reducedMotion ? " is-reduced-motion" : ""}`} role="status" aria-live="polite" aria-label={`Đang mở ${title}`}>
      <svg className="page-transition-clip" aria-hidden="true" width="0" height="0">
        <defs>
          <clipPath id="page-transition-clip-path" clipPathUnits="objectBoundingBox">
            <path d={toObjectBoundingBoxPath(clipPath)} />
          </clipPath>
        </defs>
      </svg>
      <div className="page-transition-curtain" style={{ clipPath: "url(#page-transition-clip-path)" }}>
        <div className="page-transition-center">
          <LoaderMark />
          <p className="page-transition-title">{title}</p>
          <span className="page-transition-caption">ĐANG MỞ</span>
        </div>
      </div>
    </div>
  );
}
