import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import SiteFooter from "./components/SiteFooter.jsx";
import Hero from "./components/sections/Hero.jsx";
import StoryMessageSection from "./components/sections/StoryMessageSection.jsx";
import ExploreStatementSection from "./components/sections/ExploreStatementSection.jsx";
import PageLoader from "./components/PageLoader.jsx";
import { SiteContentProvider, useSiteContent } from "./content/SiteContentProvider.jsx";
import { getSiteAppearanceClassName, getSiteAppearanceStyle } from "./content/site-theme.js";
import { useMomentumScroll, useReducedMotion } from "./hooks/useMotion.js";
import { getRouteKeyFromSnapshot } from "./route-transition.js";

const AdminRoute = lazy(() => import("./components/AdminRoute.jsx"));
const CommunityPartnersSection = lazy(() => import("./components/sections/CommunityPartnersSection.jsx"));
const ClosingSection = lazy(() => import("./components/ClosingSection.jsx"));
const PageContour = lazy(() => import("./components/PageContour.jsx"));
const PageTransition = lazy(() => import("./components/PageTransition.jsx"));
const SeasonsSection = lazy(() => import("./components/sections/SeasonsSection.jsx"));
const VisitChoicesSection = lazy(() => import("./components/sections/VisitChoicesSection.jsx"));
const VillageArchiveSection = lazy(() => import("./components/sections/VillageArchiveSection.jsx"));
const VillageUpdatesSection = lazy(() => import("./components/sections/VillageUpdatesSection.jsx"));

function isAdminRoute() {
  if (typeof window === "undefined") return false;
  return window.location.pathname.replace(/\/+$/, "") === "/admin"
    || window.location.hash === "#admin"
    || window.location.hash.startsWith("#admin-");
}

function isPreviewRoute() {
  if (typeof window === "undefined") return false;
  return window.location.hash.startsWith("#site-preview");
}

function DeferredSection({ Component, fallbackClassName, sectionId, eager = false, ...componentProps }) {
  const placeholderRef = useRef(null);
  const [ready, setReady] = useState(() => (
    eager || (typeof window !== "undefined" && window.location.hash === `#${sectionId}`)
  ));
  const [isHashTarget, setIsHashTarget] = useState(() => (
    typeof window !== "undefined" && window.location.hash === `#${sectionId}`
  ));

  useEffect(() => {
    const activateForHash = () => {
      const matchesHash = window.location.hash === `#${sectionId}`;
      setIsHashTarget(matchesHash);
      if (matchesHash) setReady(true);
    };
    activateForHash();

    if (ready) {
      window.addEventListener("hashchange", activateForHash);
      return () => window.removeEventListener("hashchange", activateForHash);
    }

    const placeholder = placeholderRef.current;
    const preloadViewports = window.matchMedia("(max-width: 680px)").matches ? 5 : 3;
    const preloadDistance = Math.max(window.innerHeight * preloadViewports, window.innerWidth * 2);
    const observer = typeof IntersectionObserver === "undefined" || !placeholder
      ? null
      : new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        setReady(true);
        observer.disconnect();
      }, { rootMargin: `${Math.round(preloadDistance)}px 0px` });

    observer?.observe(placeholder);
    window.addEventListener("hashchange", activateForHash);

    return () => {
      observer?.disconnect();
      window.removeEventListener("hashchange", activateForHash);
    };
  }, [ready, sectionId]);

  useEffect(() => {
    if (!ready || !isHashTarget) return undefined;

    let frameId = 0;
    let attempts = 0;
    const scrollToTarget = () => {
      const target = document.getElementById(sectionId);
      if (!target || target.classList.contains("section-lazy-placeholder")) {
        if (attempts < 120) {
          attempts += 1;
          frameId = window.requestAnimationFrame(scrollToTarget);
        }
        return;
      }
      target.scrollIntoView({ behavior: "auto", block: "start" });
    };

    frameId = window.requestAnimationFrame(scrollToTarget);
    return () => window.cancelAnimationFrame(frameId);
  }, [isHashTarget, ready, sectionId]);

  const fallback = (
    <div
      aria-hidden="true"
      className={fallbackClassName}
      id={sectionId}
      ref={placeholderRef}
    />
  );

  if (!ready) return fallback;

  return (
    <Suspense fallback={fallback}>
      <Component {...componentProps} />
    </Suspense>
  );
}

function PublicHome({ previewMode = false, heroRevealReady = false }) {
  const { content, replaceContent } = useSiteContent();
  const [menuOpen, setMenuOpen] = useState(false);
  const contourCanvasRef = useRef(null);
  const systemReducedMotion = useReducedMotion();
  const appearance = content.settings.appearance;
  const reducedMotion = previewMode || systemReducedMotion || appearance.effects.motion !== "full";
  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useMomentumScroll(reducedMotion);

  useEffect(() => {
    if (!previewMode) return undefined;
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      if (event.data?.source !== "thon3-admin-preview") return;
      if (event.data.type !== "content" || !event.data.content) return;

      replaceContent(event.data.content);
      const target = event.data.sectionTarget || "home";
      const focusTarget = event.data.focusTarget || "";
      let attempts = 0;
      const scrollToPreviewTarget = () => {
        const section = document.getElementById(target);
        const focus = focusTarget
          ? document.querySelector(`[data-preview-target="${CSS.escape(focusTarget)}"]`)
          : null;
        if (section || focus || attempts >= 24) {
          section?.scrollIntoView({ behavior: "auto", block: "start" });
          focus?.scrollIntoView({ behavior: "auto", block: "center" });
          return;
        }
        attempts += 1;
        window.setTimeout(scrollToPreviewTarget, 50);
      };
      window.setTimeout(scrollToPreviewTarget, 0);
    };

    window.parent.postMessage({ source: "thon3-admin-preview", type: "ready" }, window.location.origin);
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [previewMode, replaceContent]);

  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", menuOpen);
    document.body.classList.toggle("menu-open", menuOpen);
    return () => {
      document.documentElement.classList.remove("menu-open");
      document.body.classList.remove("menu-open");
    };
  }, [menuOpen]);

  return (
    <div className={`app-shell ${getSiteAppearanceClassName(appearance)}`} style={getSiteAppearanceStyle(appearance)}>
      {!reducedMotion && (
        <Suspense fallback={null}>
          <PageContour canvasRef={contourCanvasRef} reducedMotion={reducedMotion} />
        </Suspense>
      )}
      <a className="skip-link" href="#noi-dung">Đi tới nội dung chính</a>
      <Header menuOpen={menuOpen} onToggleMenu={toggleMenu} onCloseMenu={closeMenu} />

      <main id="noi-dung">
        <Hero reducedMotion={reducedMotion} heroRevealReady={heroRevealReady} />
        <StoryMessageSection contourCanvasRef={contourCanvasRef} reducedMotion={reducedMotion} />
        <ExploreStatementSection reducedMotion={reducedMotion} />
        <DeferredSection
          Component={SeasonsSection}
          eager={previewMode}
          fallbackClassName="season-gallery-section section-lazy-placeholder"
          reducedMotion={reducedMotion}
          sectionId="nhung-mua"
        />
        <DeferredSection
          Component={VisitChoicesSection}
          eager={previewMode}
          fallbackClassName="visit-choices-section section-lazy-placeholder"
          reducedMotion={reducedMotion}
          sectionId="lien-he"
        />
        <DeferredSection
          Component={VillageArchiveSection}
          eager={previewMode}
          fallbackClassName="village-archive-section section-lazy-placeholder"
          reducedMotion={reducedMotion}
          sectionId="tu-lieu"
        />
        <DeferredSection
          Component={CommunityPartnersSection}
          eager={previewMode}
          fallbackClassName="community-partners-loading section-lazy-placeholder"
          reducedMotion={reducedMotion}
          sectionId="dong-hanh"
        />
        <DeferredSection
          Component={VillageUpdatesSection}
          eager={previewMode}
          fallbackClassName="village-updates-section section-lazy-placeholder"
          reducedMotion={reducedMotion}
          sectionId="nhip-song-hom-nay"
        />
      </main>

      <DeferredSection
        Component={ClosingSection}
        eager={previewMode}
        fallbackClassName="closing-section closing-section-loading section-lazy-placeholder"
        reducedMotion={reducedMotion}
        sectionId="ket-lai"
      />
      <SiteFooter />
    </div>
  );
}

const ComingSoonPage = lazy(() => import("./components/ComingSoonPage.jsx"));

const COMING_SOON_ROUTES = {
  "/cau-chuyen": {
    title: "Coming soon!",
    description: "Không gian lưu giữ những câu chuyện, ký ức và nhịp sống của Mê Linh đang được hoàn thiện.",
  },
  "/nhung-mua": {
    title: "Coming soon!",
    description: "Bốn mùa ở Mê Linh sẽ được kể lại bằng những hình ảnh và khoảnh khắc rất riêng.",
  },
  "/ban-do": {
    title: "Coming soon!",
    description: "Bản đồ những điểm đến, con đường và câu chuyện quanh Mê Linh đang được chuẩn bị.",
  },
  "/dong-hanh": {
    title: "Coming soon!",
    description: "Những người đồng hành cùng Mê Linh sẽ được giới thiệu trong không gian này.",
  },
  "/tu-lieu": {
    title: "Coming soon!",
    description: "Kho tư liệu và ký ức Mê Linh đang được biên tập để mở đón bạn.",
  },
  "/ket-lai": {
    title: "Coming soon!",
    description: "Không gian kết nối và cập nhật những câu chuyện mới từ Mê Linh đang được hoàn thiện.",
  },
  "/lien-he": {
    title: "Coming soon!",
    description: "Thông tin ghé thăm, liên hệ và những gợi ý cho hành trình về Mê Linh đang được chuẩn bị.",
  },
  "/kho-luu-tru": {
    title: "Coming soon!",
    description: "Kho lưu trữ ký ức Mê Linh đang được chuẩn bị.",
  },
  "/tin-tuc": {
    title: "Tin tức sắp ra mắt",
    description: "Nhịp sống tin tức Mê Linh đang được biên tập.",
  },
  "/sap-ra-mat": {
    title: "Coming soon!",
    description: "Không gian này đang được biên tập và hoàn thiện.",
  },
  "/coming-soon": {
    title: "Coming soon!",
    description: "Không gian này đang được biên tập và hoàn thiện.",
  },
};


function getRouteSnapshot() {
  if (typeof window === "undefined") return { type: "home", route: "/" };
  const { pathname, hash } = window.location;
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  if (hash.startsWith("#site-preview")) return { type: "preview", route: normalizedPath };
  if (normalizedPath === "/admin" || hash === "#admin" || hash.startsWith("#admin-")) {
    return { type: "admin", route: normalizedPath };
  }
  if (COMING_SOON_ROUTES[normalizedPath]) return { type: "coming-soon", route: normalizedPath };
  return { type: "home", route: "/" };
}

function RouteReady({ routeKey, onReady }) {
  useEffect(() => {
    onReady?.(routeKey);
  }, [onReady, routeKey]);

  return null;
}

function AppRouter({ heroRevealReady = false, onRouteReady }) {
  const { content } = useSiteContent();
  const [route, setRoute] = useState(getRouteSnapshot);

  useEffect(() => {
    const updateRoute = () => setRoute(getRouteSnapshot());
    window.addEventListener("hashchange", updateRoute);
    window.addEventListener("popstate", updateRoute);
    return () => {
      window.removeEventListener("hashchange", updateRoute);
      window.removeEventListener("popstate", updateRoute);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("non-public-route", route.type === "admin" || route.type === "coming-soon");
    document.title = route.type === "admin"
      ? `Quản trị nội dung | ${content.settings.siteName}`
      : route.type === "coming-soon"
        ? `Coming soon | ${content.settings.siteName}`
        : `${content.settings.siteName} | ${content.settings.tagline}`;
    const description = document.querySelector('meta[name="description"]');
    if (description && route.type !== "admin") {
      description.setAttribute("content", `${content.settings.siteName} - ${content.settings.tagline}`);
    }
  }, [route.type, content.settings.siteName, content.settings.tagline]);

  if (route.type === "preview") {
    return <PublicHome previewMode heroRevealReady={heroRevealReady} />;
  }

  if (route.type === "coming-soon") {
    const routeKey = getRouteKeyFromSnapshot(route);
    return (
      <Suspense fallback={<div className="route-state-loading" aria-label="Đang mở..." />}>
        <ComingSoonPage
          {...(COMING_SOON_ROUTES[route.route] || COMING_SOON_ROUTES["/coming-soon"])}
          heroRevealReady={heroRevealReady}
        />
        <RouteReady routeKey={routeKey} onReady={onRouteReady} />
      </Suspense>
    );
  }

  if (route.type !== "admin") {
    return (
      <>
        <PublicHome heroRevealReady={heroRevealReady} />
        <RouteReady routeKey={getRouteKeyFromSnapshot(route)} onReady={onRouteReady} />
      </>
    );
  }

  return (
    <Suspense fallback={<div className="admin-loading">Đang mở quản trị nội dung...</div>}>
      <AdminRoute onRouteReady={onRouteReady} />
    </Suspense>
  );
}

function AppContent() {
  // Keep route entrance motion behind the loader from competing for the same frames.
  const { connectionStatus, error, loading, retryLoad } = useSiteContent();
  const [heroRevealReady, setHeroRevealReady] = useState(false);
  const reducedMotion = useReducedMotion();
  const [currentRouteKey, setCurrentRouteKey] = useState(() => getRouteKeyFromSnapshot(getRouteSnapshot()));
  const handleLoaderExit = useCallback(() => setHeroRevealReady(true), []);

  return (
    <>
      <AppRouter heroRevealReady={heroRevealReady} onRouteReady={setCurrentRouteKey} />
      <Suspense fallback={null}>
        <PageTransition currentRouteKey={currentRouteKey} reducedMotion={reducedMotion} />
      </Suspense>
      <Suspense fallback={null}>
        <PageLoader
          connectionStatus={connectionStatus}
          contentError={error}
          contentReady={!loading && !error}
          onExitComplete={handleLoaderExit}
          onRetry={retryLoad}
        />
      </Suspense>
    </>
  );
}

function App() {
  return (
    <SiteContentProvider>
      <AppContent />
    </SiteContentProvider>
  );
}

export default App;
