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
import { AuthProvider, useAuth } from "./lib/AuthProvider.jsx";
import { isBackendConfigured } from "./lib/backend-api.js";
import { getPublicHomeHref } from "./components/admin/admin-registry.js";
import { getRouteKeyFromSnapshot } from "./route-transition.js";
import PageTransition from "./components/PageTransition.jsx";

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
          <a className="admin-secondary-button" href={getPublicHomeHref(typeof window === "undefined" ? "/" : window.location.pathname, "home")}>Về trang chủ</a>
        </div>
      </main>
    );
  }
}

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

function AppRouter({ heroRevealReady = false, onRouteReady }) {
  const { content } = useSiteContent();
  const { configured, loading: authLoading, isAdmin, logout } = useAuth();
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
    onRouteReady?.(getRouteKeyFromSnapshot(route));
  }, [onRouteReady, route]);

  useEffect(() => {
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

  const handleAdminLogout = async () => {
    await logout();
    window.location.assign(getPublicHomeHref(window.location.pathname, "home"));
  };

  const handleAdminCancel = () => {
    window.location.assign(getPublicHomeHref(window.location.pathname, "home"));
  };

  if (route.type === "preview") {
    return <PublicHome previewMode heroRevealReady={heroRevealReady} />;
  }

  if (route.type === "coming-soon") {
    return (
      <Suspense fallback={<div className="route-state-loading" aria-label="Đang mở..." />}>
        <ComingSoonPage
          {...(COMING_SOON_ROUTES[route.route] || COMING_SOON_ROUTES["/coming-soon"])}
          heroRevealReady={heroRevealReady}
        />
      </Suspense>
    );
  }

  if (route.type !== "admin") {
    return <PublicHome heroRevealReady={heroRevealReady} />;
  }

  if (authLoading && route.type === "admin") {
    return <div className="admin-loading">Đang xác thực quản trị...</div>;
  }

  if (!configured && route.type === "admin") {
    return (
      <main className="admin-error-state">
        <p className="admin-error-eyebrow">QUẢN TRỊ NỘI DUNG</p>
        <h1>Backend chưa được cấu hình</h1>
        <p>Hãy khởi động backend MySQL và đặt VITE_API_BASE_URL để đăng nhập và lưu dữ liệu trên máy chủ.</p>
        <button className="admin-secondary-button" type="button" onClick={handleAdminCancel}>Về trang chủ</button>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <PublicHome heroRevealReady={heroRevealReady} />
        <Suspense fallback={null}>
          <AdminLoginModal
            onLoginSuccess={() => window.location.reload()}
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
  const [currentRouteKey, setCurrentRouteKey] = useState(() => getRouteKeyFromSnapshot(getRouteSnapshot()));
  const handleLoaderExit = useCallback(() => setHeroRevealReady(true), []);

  return (
    <AuthProvider>
      <SiteContentProvider>
        <AppRouter heroRevealReady={heroRevealReady} onRouteReady={setCurrentRouteKey} />
        <PageTransition currentRouteKey={currentRouteKey} />
      </SiteContentProvider>
      <Suspense fallback={null}>
        <PageLoader onExitComplete={handleLoaderExit} />
      </Suspense>
    </AuthProvider>
  );
}

export default App;
