import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import PageContour from "./components/PageContour.jsx";
import SiteFooter from "./components/SiteFooter.jsx";
import Hero from "./components/sections/Hero.jsx";
import StoryMessageSection from "./components/sections/StoryMessageSection.jsx";
import ExploreStatementSection from "./components/sections/ExploreStatementSection.jsx";
import SeasonsSection from "./components/sections/SeasonsSection.jsx";
import { SiteContentProvider, useSiteContent } from "./content/SiteContentProvider.jsx";
import { getSiteAppearanceClassName, getSiteAppearanceStyle } from "./content/site-theme.js";
import { useMomentumScroll, useReducedMotion } from "./hooks/useMotion.js";

const AdminPage = lazy(() => import("./components/AdminPage.jsx"));
const AdminLoginModal = lazy(() => import("./components/AdminLoginModal.jsx"));
const CommunityPartnersSection = lazy(() => import("./components/sections/CommunityPartnersSection.jsx"));
const ClosingSection = lazy(() => import("./components/ClosingSection.jsx"));
const PageLoader = lazy(() => import("./components/PageLoader.jsx"));
const VisitChoicesSection = lazy(() => import("./components/sections/VisitChoicesSection.jsx"));
const VillageArchiveSection = lazy(() => import("./components/sections/VillageArchiveSection.jsx"));
const VillageUpdatesSection = lazy(() => import("./components/sections/VillageUpdatesSection.jsx"));

class AdminRouteErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleReset = () => {
    localStorage.removeItem("xa-me-linh-site-content-draft-v6");
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="admin-error-state">
        <p className="admin-error-eyebrow">QUẢN TRỊ NỘI DUNG</p>
        <h1>Không thể mở trang quản trị</h1>
        <p>Bản nháp trong trình duyệt có thể không còn tương thích. Hãy tạo lại bản nháp mặc định rồi mở lại phần quản trị.</p>
        <div className="admin-error-actions">
          <button className="admin-primary-button" type="button" onClick={this.handleReset}>Tạo lại bản nháp</button>
          <a className="admin-secondary-button" href="/#home">Về trang chủ</a>
        </div>
      </main>
    );
  }
}

function isAdminRoute() {
  if (typeof window === "undefined") return false;
  return window.location.pathname === "/admin"
    || window.location.hash === "#admin"
    || window.location.hash.startsWith("#admin-");
}

function isPreviewRoute() {
  if (typeof window === "undefined") return false;
  return window.location.hash.startsWith("#site-preview");
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
      window.setTimeout(() => {
        document.getElementById(target)?.scrollIntoView({ behavior: "auto", block: "start" });
        if (event.data.focusTarget) {
          document.querySelector(`[data-preview-target="${CSS.escape(event.data.focusTarget)}"]`)?.scrollIntoView({ behavior: "auto", block: "center" });
        }
      }, 0);
    };

    window.parent.postMessage({ source: "thon3-admin-preview", type: "ready" }, window.location.origin);
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [previewMode, replaceContent]);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
    return () => document.body.classList.remove("menu-open");
  }, [menuOpen]);

  return (
    <div className={`app-shell ${getSiteAppearanceClassName(appearance)}`} style={getSiteAppearanceStyle(appearance)}>
      <PageContour canvasRef={contourCanvasRef} reducedMotion={reducedMotion} />
      <a className="skip-link" href="#noi-dung">Đi tới nội dung chính</a>
      <Header menuOpen={menuOpen} onToggleMenu={toggleMenu} onCloseMenu={closeMenu} />

      <main id="noi-dung">
        <Hero reducedMotion={reducedMotion} heroRevealReady={heroRevealReady} />
        <StoryMessageSection contourCanvasRef={contourCanvasRef} reducedMotion={reducedMotion} />
        <ExploreStatementSection reducedMotion={reducedMotion} />
        <SeasonsSection reducedMotion={reducedMotion} />
        <Suspense fallback={<div className="visit-choices-section section-lazy-placeholder" aria-hidden="true" />}>
          <VisitChoicesSection reducedMotion={reducedMotion} />
        </Suspense>
        <Suspense fallback={<div className="village-archive-section section-lazy-placeholder" aria-hidden="true" />}>
          <VillageArchiveSection reducedMotion={reducedMotion} />
        </Suspense>
        <Suspense fallback={<div className="community-partners-loading" aria-hidden="true" />}>
          <CommunityPartnersSection reducedMotion={reducedMotion} />
        </Suspense>
        <Suspense fallback={<div className="village-updates-section section-lazy-placeholder" aria-hidden="true" />}>
          <VillageUpdatesSection reducedMotion={reducedMotion} />
        </Suspense>
      </main>

      <Suspense fallback={<div className="closing-section closing-section-loading" aria-hidden="true" />}>
        <ClosingSection />
      </Suspense>
      <SiteFooter />
    </div>
  );
}

function AppRouter({ heroRevealReady = false }) {
  const { content } = useSiteContent();
  const [adminRoute, setAdminRoute] = useState(isAdminRoute);
  const previewRoute = isPreviewRoute();
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("thon3_admin_authenticated") === "true";
  });

  useEffect(() => {
    const updateRoute = () => {
      setAdminRoute(isAdminRoute());
      setIsAdminAuthenticated(localStorage.getItem("thon3_admin_authenticated") === "true");
    };
    window.addEventListener("hashchange", updateRoute);
    window.addEventListener("popstate", updateRoute);
    return () => {
      window.removeEventListener("hashchange", updateRoute);
      window.removeEventListener("popstate", updateRoute);
    };
  }, []);

  useEffect(() => {
    document.title = adminRoute
      ? `Quản trị nội dung | ${content.settings.siteName}`
      : `${content.settings.siteName} | ${content.settings.tagline}`;
    const description = document.querySelector('meta[name="description"]');
    if (description && !adminRoute) {
      description.setAttribute("content", `${content.settings.siteName} - ${content.settings.tagline}`);
    }
  }, [adminRoute, content.settings.siteName, content.settings.tagline]);

  const handleAdminLogout = () => {
    localStorage.removeItem("thon3_admin_authenticated");
    setIsAdminAuthenticated(false);
    window.location.hash = "#home";
  };

  const handleAdminCancel = () => {
    window.location.hash = "#home";
  };

  if (previewRoute) {
    return <PublicHome previewMode heroRevealReady={heroRevealReady} />;
  }

  if (!adminRoute) {
    return <PublicHome heroRevealReady={heroRevealReady} />;
  }

  if (!isAdminAuthenticated) {
    return (
      <>
        <PublicHome heroRevealReady={heroRevealReady} />
        <Suspense fallback={null}>
          <AdminLoginModal
            onLoginSuccess={() => setIsAdminAuthenticated(true)}
            onCancel={handleAdminCancel}
          />
        </Suspense>
      </>
    );
  }

  return (
    <AdminRouteErrorBoundary>
      <Suspense fallback={<div className="admin-loading">Đang mở quản trị nội dung...</div>}>
        <AdminPage onLogout={handleAdminLogout} />
      </Suspense>
    </AdminRouteErrorBoundary>
  );
}

function App() {
  const [heroRevealReady, setHeroRevealReady] = useState(false);
  const handleLoaderExit = useCallback(() => setHeroRevealReady(true), []);

  return (
    <>
      <SiteContentProvider>
        <AppRouter heroRevealReady={heroRevealReady} />
      </SiteContentProvider>
      <Suspense fallback={null}>
        <PageLoader onExitComplete={handleLoaderExit} />
      </Suspense>
    </>
  );
}

export default App;
