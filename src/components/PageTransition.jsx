import { useEffect, useRef, useState } from "react";
import { getRouteKeyForHref, getTransitionTitle, isTransitionNavigation } from "../route-transition.js";
import SiteLoaderMark from "./SiteLoaderMark.jsx";

const COVER_DURATION = 1200;
const RETRACT_DURATION = 1100;

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
  if (!hash) return false;
  let id;
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    return false;
  }
  const target = document.getElementById(id);
  if (!target) return false;
  target.scrollIntoView({ behavior: "auto", block: "start" });
  return true;
}

export default function PageTransition({ currentRouteKey, reducedMotion = false }) {
  const [phase, setPhase] = useState("idle");
  const [title, setTitle] = useState("");
  const [drawCycle, setDrawCycle] = useState(0);
  const clipPathNodeRef = useRef(null);
  const clipPathRef = useRef(toObjectBoundingBoxPath(toClipPath(0)));
  const targetKeyRef = useRef("");
  const targetLocationRef = useRef("");
  const pendingHashRef = useRef("");
  const scrollTopRef = useRef(false);
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

  const updateClipPath = (progress, retracting = false) => {
    const nextClipPath = toObjectBoundingBoxPath(toClipPath(progress, retracting));
    clipPathRef.current = nextClipPath;
    clipPathNodeRef.current?.setAttribute("d", nextClipPath);
  };

  const finish = () => {
    stopTimers();
    updateClipPath(0);
    setPhase("idle");
    targetKeyRef.current = "";
    targetLocationRef.current = "";
    pendingHashRef.current = "";
    scrollTopRef.current = false;
    document.body.classList.remove("page-transition-active");
    document.documentElement.removeAttribute("aria-busy");
    const focusTarget = focusRef.current;
    focusRef.current = null;
    if (focusTarget?.isConnected) focusTarget.focus({ preventScroll: true });
  };

  const animate = (from, to, duration, nextPhase, token, onComplete) => {
    stopTimers();
    const startedAt = performance.now();
    const frame = (now) => {
      if (tokenRef.current !== token) return;
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = progress < 1 ? 1 - Math.pow(1 - progress, 3) : 1;
      updateClipPath(from + (to - from) * eased, nextPhase === "retracting");
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else if (nextPhase === "idle") {
        finish();
      } else {
        rafRef.current = null;
        if (onComplete) onComplete();
        else setPhase(nextPhase);
      }
    };
    rafRef.current = requestAnimationFrame(frame);
  };

  useEffect(() => {
    if (phase !== "waiting" || !targetKeyRef.current) return undefined;
    const isDestinationReady = currentRouteKey === targetKeyRef.current;
    if (!isDestinationReady) return undefined;

    const token = tokenRef.current;
    const frame = requestAnimationFrame(() => {
      if (tokenRef.current !== token) return;
      if (pendingHashRef.current) {
        if (scrollTopRef.current) {
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        } else {
          scrollToHash(pendingHashRef.current);
        }
        pendingHashRef.current = "";
        scrollTopRef.current = false;
      }
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
      if (!anchor) return;
      const isScrollTop = anchor.dataset.scrollTop === "true";
      if (!isScrollTop && !isTransitionNavigation(anchor)) return;

      const destination = new URL(anchor.href, window.location.href);
      const destinationKey = getRouteKeyForHref(destination.href);
      const destinationLocation = getLocation(destination.href);
      if (!destinationKey || (!isScrollTop && destinationLocation === getLocation(window.location.href))) return;

      event.preventDefault();
      event.stopPropagation();
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
        pendingHashRef.current = isScrollTop ? "#home" : destination.hash;
        scrollTopRef.current = isScrollTop;
        if (!isScrollTop && !destination.hash) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        if (destinationKey === currentRouteKey && !isScrollTop) {
          setPhase("retracting");
          animate(100, 0, reducedMotion ? 1 : RETRACT_DURATION, "idle", token);
        } else {
          setPhase("waiting");
        }
      };

      if (reducedMotion) {
        updateClipPath(100);
        revealDestination();
        if (destinationKey !== currentRouteKey) setPhase("waiting");
      } else {
        animate(0, 100, COVER_DURATION, "waiting", token, revealDestination);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [currentRouteKey, phase, reducedMotion]);

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
            <path ref={clipPathNodeRef} d={clipPathRef.current} />
          </clipPath>
        </defs>
      </svg>
      <div className="page-transition-curtain" style={{ clipPath: "url(#page-transition-clip-path)" }}>
        <div className="page-transition-center">
          <SiteLoaderMark key={drawCycle} />
          <p className="page-transition-title">{title}</p>
          <span className="page-transition-caption">XÃ MÊ LINH</span>
        </div>
      </div>
    </div>
  );
}
