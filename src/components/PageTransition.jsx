import { useEffect, useRef, useState } from "react";
import { getRouteKeyForHref, getTransitionTitle, isTransitionNavigation } from "../route-transition.js";
import { LoaderMark } from "./PageLoader.jsx";

const COVER_DURATION = 1000;
const RETRACT_DURATION = 1100;
const READY_TIMEOUT = 7000;

function toClipPath(progress, retracting = false) {
  const edge = Math.max(0, Math.min(100, progress));
  const bulge = retracting
    ? -Math.sin((edge / 100) * Math.PI) * 15
    : Math.sin((edge / 100) * Math.PI) * 15;
  const curve = Math.max(0, Math.min(100, edge + bulge));
  return `M 0 0 L 100 0 L 100 ${edge} Q 50 ${curve} 0 ${edge} Z`;
}

function toObjectBoundingBoxPath(path) {
  return path.replace(/(-?\d+(?:\.\d+)?)/g, (value) => (Number(value) / 100).toFixed(4));
}

function getLocation(href) {
  const url = new URL(href, window.location.href);
  return `${url.pathname}${url.search}${url.hash}`;
}

function scrollToHash(hash) {
  if (!hash) return;
  let id;
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    return;
  }
  const target = document.getElementById(id);
  if (!target) return;
  requestAnimationFrame(() => target.scrollIntoView({ behavior: "auto", block: "start" }));
}

export default function PageTransition({ currentRouteKey, reducedMotion = false }) {
  const [phase, setPhase] = useState("idle");
  const [title, setTitle] = useState("");
  const [drawCycle, setDrawCycle] = useState(0);
  const [clipPath, setClipPath] = useState(toClipPath(0));
  const targetKeyRef = useRef("");
  const targetLocationRef = useRef("");
  const tokenRef = useRef(0);
  const rafRef = useRef(null);
  const timeoutRef = useRef(null);
  const focusRef = useRef(null);

  const stopTimers = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    rafRef.current = null;
    timeoutRef.current = null;
  };

  const finish = () => {
    stopTimers();
    setClipPath(toClipPath(0));
    setPhase("idle");
    targetKeyRef.current = "";
    targetLocationRef.current = "";
    document.body.classList.remove("page-transition-active");
    document.documentElement.removeAttribute("aria-busy");
    const focusTarget = focusRef.current;
    focusRef.current = null;
    if (focusTarget?.isConnected) focusTarget.focus({ preventScroll: true });
  };

  const animate = (from, to, duration, nextPhase, token) => {
    stopTimers();
    const startedAt = performance.now();
    const frame = (now) => {
      if (tokenRef.current !== token) return;
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = progress < 1 ? 1 - Math.pow(1 - progress, 3) : 1;
      setClipPath(toClipPath(from + (to - from) * eased, nextPhase === "retracting"));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else if (nextPhase === "idle") {
        finish();
      } else {
        rafRef.current = null;
        setPhase(nextPhase);
      }
    };
    rafRef.current = requestAnimationFrame(frame);
  };

  useEffect(() => {
    if (phase !== "waiting" || !targetKeyRef.current) return undefined;
    const isSamePageHash = targetKeyRef.current === currentRouteKey
      && targetLocationRef.current.includes("#")
      && getLocation(window.location.href) === targetLocationRef.current;
    if (isSamePageHash || currentRouteKey !== targetKeyRef.current) return undefined;

    const token = tokenRef.current;
    const frame = requestAnimationFrame(() => {
      if (tokenRef.current !== token) return;
      setPhase("retracting");
      animate(100, 0, reducedMotion ? 1 : RETRACT_DURATION, "idle", token);
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
      const destinationLocation = getLocation(destination.href);
      if (!destinationKey || destinationLocation === getLocation(window.location.href)) return;

      event.preventDefault();
      focusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      targetKeyRef.current = destinationKey;
      targetLocationRef.current = destinationLocation;
      setTitle(getTransitionTitle(destination.href));
      setDrawCycle((cycle) => cycle + 1);
      document.body.classList.add("page-transition-active");
      document.documentElement.setAttribute("aria-busy", "true");
      const token = ++tokenRef.current;
      setPhase("covering");

      const revealDestination = () => {
        if (tokenRef.current !== token) return;
        window.history.pushState({}, "", destinationLocation);
        window.dispatchEvent(new PopStateEvent("popstate"));
        scrollToHash(destination.hash);
        if (destinationKey === currentRouteKey) {
          setPhase("retracting");
          animate(100, 0, reducedMotion ? 1 : RETRACT_DURATION, "idle", token);
        }
      };

      if (reducedMotion) {
        setClipPath(toClipPath(100));
        revealDestination();
        if (destinationKey !== currentRouteKey) setPhase("waiting");
      } else {
        animate(0, 100, COVER_DURATION, "waiting", token);
        timeoutRef.current = window.setTimeout(revealDestination, COVER_DURATION + 20);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [currentRouteKey, phase, reducedMotion]);

  useEffect(() => {
    if (phase !== "waiting") return undefined;
    timeoutRef.current = window.setTimeout(finish, READY_TIMEOUT);
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
    <div
      className={`page-transition is-${phase}${reducedMotion ? " is-reduced-motion" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={`Đang mở ${title}`}
    >
      <svg className="page-transition-clip" aria-hidden="true" width="0" height="0">
        <defs>
          <clipPath id="page-transition-clip-path" clipPathUnits="objectBoundingBox">
            <path d={toObjectBoundingBoxPath(clipPath)} />
          </clipPath>
        </defs>
      </svg>
      <div className="page-transition-curtain" style={{ clipPath: "url(#page-transition-clip-path)" }}>
        <div className="page-transition-center">
          <LoaderMark label={title} key={`${title}-${drawCycle}`} />
          <p className="page-transition-title">{title}</p>
          <span className="page-transition-caption">XÃ MÊ LINH</span>
        </div>
      </div>
    </div>
  );
}
