import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
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
const CommunityPartnersSection = lazy(() => import("./components/sections/CommunityPartnersSection.jsx"));
const ClosingSection = lazy(() => import("./components/ClosingSection.jsx"));
const PageLoader = lazy(() => import("./components/PageLoader.jsx"));
const VisitChoicesSection = lazy(() => import("./components/sections/VisitChoicesSection.jsx"));
const VillageArchiveSection = lazy(() => import("./components/sections/VillageArchiveSection.jsx"));
const VillageUpdatesSection = lazy(() => import("./components/sections/VillageUpdatesSection.jsx"));

function isAdminRoute() {
  if (typeof window === "undefined") return false;
  return window.location.pathname === "/admin"
    || window.location.hash === "#admin"
    || window.location.hash.startsWith("#admin-");
}

function PublicHome() {
  const { content } = useSiteContent();
  const [menuOpen, setMenuOpen] = useState(false);
  const contourCanvasRef = useRef(null);
  const systemReducedMotion = useReducedMotion();
  const appearance = content.settings.appearance;
  const reducedMotion = systemReducedMotion || appearance.effects.motion !== "full";
  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useMomentumScroll(reducedMotion);

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
        <Hero reducedMotion={reducedMotion} />
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

function AppRouter() {
  const { content } = useSiteContent();
  const [adminRoute, setAdminRoute] = useState(isAdminRoute);

  useEffect(() => {
    const updateRoute = () => setAdminRoute(isAdminRoute());
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

  return adminRoute ? (
    <Suspense fallback={<div className="admin-loading">Đang mở quản trị nội dung...</div>}>
      <AdminPage />
    </Suspense>
  ) : <PublicHome />;
}

function App() {
  return (
    <>
      <SiteContentProvider>
        <AppRouter />
      </SiteContentProvider>
      <Suspense fallback={null}>
        <PageLoader />
      </Suspense>
    </>
  );
}

export default App;
