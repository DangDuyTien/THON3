import React, { lazy, Suspense, useEffect, useState } from "react";
import { AuthProvider, useAuth } from "../lib/AuthProvider.jsx";
import { getPublicHomeHref } from "./admin/admin-registry.js";

const AdminPage = lazy(() => import("./AdminPage.jsx"));
const AdminLoginModal = lazy(() => import("./AdminLoginModal.jsx"));

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

function AdminRouteContent({ onRouteReady }) {
  const { configured, loading: authLoading, isAdmin, logout, forgetSession } = useAuth();
  const [adminLoginReady, setAdminLoginReady] = useState(false);

  useEffect(() => {
    const adminWaiting = authLoading || (!configured ? false : !isAdmin && !adminLoginReady);
    if (!adminWaiting) onRouteReady?.("admin:/admin");
  }, [adminLoginReady, authLoading, configured, isAdmin, onRouteReady]);

  const navigateHome = () => {
    const destination = getPublicHomeHref(window.location.pathname, "home");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.history.pushState({}, "", destination);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const handleAdminLogout = async () => {
    await logout();
    navigateHome();
  };

  const handleSessionRevoked = () => {
    forgetSession();
    navigateHome();
  };

  if (authLoading) {
    return <div className="admin-loading">Đang xác thực quản trị...</div>;
  }

  if (!configured) {
    return (
      <main className="admin-error-state">
        <p className="admin-error-eyebrow">QUẢN TRỊ NỘI DUNG</p>
        <h1>Backend chưa được cấu hình</h1>
        <p>Hãy khởi động backend MySQL và đặt VITE_API_BASE_URL để đăng nhập và lưu dữ liệu trên máy chủ.</p>
        <button className="admin-secondary-button" type="button" onClick={navigateHome}>Về trang chủ</button>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <Suspense fallback={<div className="admin-route-transition-fallback" aria-hidden="true" />}>
        <AdminLoginModal
          onLoginSuccess={() => undefined}
          onReady={() => setAdminLoginReady(true)}
          onCancel={navigateHome}
        />
      </Suspense>
    );
  }

  return (
    <AdminRouteErrorBoundary>
      <Suspense fallback={<div className="admin-loading">Đang mở quản trị nội dung...</div>}>
        <AdminPage onLogout={handleAdminLogout} onSessionRevoked={handleSessionRevoked} />
      </Suspense>
    </AdminRouteErrorBoundary>
  );
}

export default function AdminRoute({ onRouteReady }) {
  return (
    <AuthProvider>
      <AdminRouteContent onRouteReady={onRouteReady} />
    </AuthProvider>
  );
}
