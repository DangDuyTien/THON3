import React, { useEffect, useRef, useState } from "react";
import "../styles-admin.css";
import { ArrowLeft, Eye, EyeOff, Lock, ShieldCheck, User, X } from "lucide-react";
import AdaptiveImage from "./AdaptiveImage.jsx";
import YouthUnionEmblem from "./icons/YouthUnionEmblem.jsx";
import { confirmPasswordRecovery, requestPasswordRecovery } from "../lib/auth-api.js";
import { useAuth } from "../lib/AuthProvider.jsx";
import { useSiteContent } from "../content/SiteContentProvider.jsx";

const FOCUSABLE_SELECTOR = "button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex=\"-1\"])";

function KineticRollText({ children }) {
  const text = String(children);
  return (
    <span className="closing-kinetic-roll">
      <span className="closing-kinetic-white">{text}</span>
      <span className="closing-kinetic-green" aria-hidden="true">{text}</span>
    </span>
  );
}

function IconRoll() {
  return (
    <span className="header-icon-roll">
      <span className="header-icon-primary"><X aria-hidden="true" /></span>
      <span className="header-icon-hover" aria-hidden="true"><X aria-hidden="true" /></span>
    </span>
  );
}

export default function AdminLoginModal({ onLoginSuccess, onCancel, onReady }) {
  const { content } = useSiteContent();
  const { login, verifyLogin } = useAuth();
  const { siteName, tagline, adminLoginImage } = content.settings;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [loginChallenge, setLoginChallenge] = useState(null);
  const [recoveryChallenge, setRecoveryChallenge] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [animating, setAnimating] = useState(true);
  const [curveD, setCurveD] = useState("M 0 0 L 100 0 L 100 100 Q 50 100 0 100 Z");
  const [mouseY, setMouseY] = useState(0);
  const rafRef = useRef(null);
  const isClosingRef = useRef(false);
  const readyRef = useRef(false);

  // Liquid Curtain Drop Animation on Mount & Silent Scroll Reset
  useEffect(() => {
    let start = null;
    const duration = 1100;

    const animateOpen = (timestamp) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const p = Math.min(elapsed / duration, 1);

      const easeP = 1 - Math.pow(1 - p, 3);
      const bulge = Math.sin(p * Math.PI) * 28;
      const currentY = easeP * 100;
      const curveY = Math.min(currentY + bulge, 100);

      setCurveD(`M 0 0 L 100 0 L 100 ${currentY} Q 50 ${curveY} 0 ${currentY} Z`);

      // Keep the page beneath the fixed curtain untouched while it opens.

      if (p < 1) {
        rafRef.current = requestAnimationFrame(animateOpen);
      } else {
        setCurveD("M 0 0 L 100 0 L 100 100 Q 50 100 0 100 Z");
        setAnimating(false);
        if (!readyRef.current) {
          readyRef.current = true;
          onReady?.();
        }
      }
    };

    rafRef.current = requestAnimationFrame(animateOpen);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const previousActive = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusDialog = () => document.querySelector("#admin-login-dialog")?.querySelector(FOCUSABLE_SELECTOR)?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = document.querySelector("#admin-login-dialog");
      if (!dialog) return;
      const elements = [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)];
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const frame = window.requestAnimationFrame(focusDialog);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActive?.focus?.();
    };
  }, [onCancel]);
  const handleExitToHome = (e) => {
    if (e) e.preventDefault();
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    // The fixed curtain covers the page; do not fight Lenis by resetting scroll here.

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setAnimating(true);

    let start = null;
    const duration = 1000;

    const animateClose = (timestamp) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const p = Math.min(elapsed / duration, 1);

      const easeP = Math.pow(p, 3);
      const currentY = (1 - easeP) * 100;
      const bulge = Math.sin(p * Math.PI) * 22;
      const curveY = Math.max(currentY - bulge, 0);

      setCurveD(`M 0 0 L 100 0 L 100 ${currentY} Q 50 ${curveY} 0 ${currentY} Z`);

      if (p < 1) {
        rafRef.current = requestAnimationFrame(animateClose);
      } else {
        onCancel();
      }
    };

    rafRef.current = requestAnimationFrame(animateClose);
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseY(relY);
  };

  const handleMouseLeave = () => {
    setMouseY(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setStatusMsg("");
    setIsSubmitting(true);

    try {
      if (recoveryMode) {
        if (!recoveryChallenge) {
          const challenge = await requestPasswordRecovery({ email: username.trim() });
          setRecoveryChallenge(challenge);
          setStatusMsg(challenge?.message || "Nếu email hợp lệ, mã khôi phục đã được gửi.");
          setIsSubmitting(false);
          return;
        }
        if (newPassword !== confirmPassword) throw new Error("Mật khẩu mới nhập lại chưa khớp.");
        await confirmPasswordRecovery({
          email: username.trim(),
          challengeId: recoveryChallenge.challengeId,
          code: recoveryCode,
          newPassword,
        });
        setRecoveryMode(false);
        setRecoveryChallenge(null);
        setPassword("");
        setRecoveryCode("");
        setNewPassword("");
        setConfirmPassword("");
        setStatusMsg("Đã đặt lại mật khẩu và đăng xuất mọi phiên cũ. Hãy đăng nhập lại.");
      } else if (loginChallenge) {
        await verifyLogin({
          email: username.trim(),
          challengeId: loginChallenge.challengeId,
          code: recoveryCode,
        });
        onLoginSuccess();
      } else {
        const result = await login({ email: username.trim(), password });
        if (result?.mfaRequired) {
          setLoginChallenge(result);
          setPassword("");
          setRecoveryCode("");
          setStatusMsg(`Mã xác thực đã được gửi tới ${result.maskedEmail}.`);
        } else {
          onLoginSuccess();
        }
      }
    } catch (error) {
      setErrorMsg(error?.message || "Tài khoản hoặc mật khẩu không chính xác!");
    }
    setIsSubmitting(false);
  };

  const toggleRecoveryMode = () => {
    if (loginChallenge) {
      setLoginChallenge(null);
      setRecoveryCode("");
      setStatusMsg("");
      setErrorMsg("");
      return;
    }
    setRecoveryMode((current) => !current);
    setErrorMsg("");
    setStatusMsg("");
    setRecoveryChallenge(null);
    setRecoveryCode("");
    setNewPassword("");
    setConfirmPassword("");
    setPassword("");
  };

  const leftColumnPhotos = [
    { id: "1", src: "/assets/village-hero.jpg" },
    { id: "3", src: "/assets/village-hero.jpg" },
  ];

  const rightColumnPhotos = [
    { id: "2", src: "/assets/village-hero.jpg" },
    { id: "4", src: "/assets/village-hero.jpg" },
  ];

  return (
    <div className={`curtain-menu-overlay admin-login-light-curtain is-open${animating ? " is-animating" : ""}`} id="admin-login-curtain">
      {/* SVG Liquid Curtain Clip Path - Unconditionally mounted to prevent clip-path reference errors */}
      <svg className="curtain-svg-clip" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <clipPath id="admin-curtain-clip-path" clipPathUnits="objectBoundingBox">
            <path d={curveD.replace(/(\d+(\.\d+)?)/g, (m) => (parseFloat(m) / 100).toFixed(4))} />
          </clipPath>
        </defs>
      </svg>

      <div
        className="curtain-menu-content"
        id="admin-login-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-login-title"
        style={{ clipPath: "url(#admin-curtain-clip-path)" }}
      >
        {/* Organic Background Contour Waves inside Menu - Electric Blue Waves */}
        <svg className="curtain-contour-bg" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path d="M-100 140 Q 300 380, 700 180 T 1540 320" stroke="rgba(0, 102, 255, 0.28)" strokeWidth="2.2" />
          <path d="M-100 320 Q 400 120, 800 580 T 1540 420" stroke="rgba(0, 162, 255, 0.35)" strokeWidth="2.8" />
          <path d="M-100 520 Q 350 720, 900 260 T 1540 620" stroke="rgba(0, 102, 255, 0.20)" strokeWidth="1.8" />
          <path d="M-100 720 Q 500 480, 850 820 T 1540 720" stroke="rgba(0, 162, 255, 0.30)" strokeWidth="2.4" />
        </svg>

        {/* Top Header Bar inside Liquid Curtain */}
        <header className="curtain-menu-header">
          <a className="curtain-brand-lando" href="/" onClick={handleExitToHome}>
            <span>{siteName}</span>
            <span>{tagline}</span>
          </a>

          <div className="curtain-header-actions">
            <button className="visit-link" type="button" onClick={handleExitToHome} title="Trở về trang chủ">
              <ArrowLeft aria-hidden="true" />
              <KineticRollText>TRANG CHỦ</KineticRollText>
            </button>
            <button className="menu-button" type="button" onClick={handleExitToHome} aria-label="Đóng cửa sổ">
              <IconRoll />
            </button>
          </div>
        </header>

        {/* Main Body Grid: Photos on Left, Admin Login Form on Right */}
        <div className="curtain-menu-body admin-login-curtain-body" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
          {/* Left Side: Staggered Village Photo Grid */}
          <div className="curtain-photos-container">
            <div
              className="curtain-photos-col curtain-photos-col-left"
              style={{ transform: `translate3d(0, ${-mouseY * 90}px, 0)` }}
            >
              {leftColumnPhotos.map((photo) => (
                <div className="curtain-photo-card" key={photo.id}>
                  <AdaptiveImage src={adminLoginImage || photo.src} alt="" />
                </div>
              ))}
            </div>

            <div
              className="curtain-photos-col curtain-photos-col-right"
              style={{ transform: `translate3d(0, ${mouseY * 90}px, 0)` }}
            >
              {rightColumnPhotos.map((photo) => (
                <div className="curtain-photo-card" key={photo.id}>
                  <AdaptiveImage src={adminLoginImage || photo.src} alt="" />
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Editorial Admin Login Panel - White & Youth Union Blue Theme */}
          <div className="curtain-right-panel admin-login-curtain-panel">
            <div className="admin-login-card-editorial">
              <div className="admin-login-crest">
                <YouthUnionEmblem size={56} />
                <div className="admin-login-title-group">
                  <span className="admin-login-eyebrow">ĐOÀN THANH NIÊN CS HỒ CHÍ MINH • THÔN MÊ LINH</span>
                  <h2 id="admin-login-title">QUẢN TRỊ NỘI DUNG</h2>
                  <p>Đăng nhập tài khoản ban quản trị để chỉnh sửa dữ liệu website</p>
                </div>
              </div>

              <form className="admin-login-form-editorial" onSubmit={handleSubmit}>
                {errorMsg && (
                  <div className="admin-login-error-pill" role="alert">
                    <span>⚠️ {errorMsg}</span>
                  </div>
                )}
                {statusMsg && (
                  <div className="admin-login-error-pill is-success" role="status">
                    <span>{statusMsg}</span>
                  </div>
                )}

                <div className="admin-login-field-group">
                  <label htmlFor="admin-username">TÀI KHOẢN QUẢN TRỊ</label>
                  <div className="admin-login-input-box">
                    <User className="admin-login-field-icon" aria-hidden="true" />
                    <input
                      id="admin-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="email quản trị"
                      disabled={Boolean(loginChallenge || recoveryChallenge)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {!loginChallenge && (!recoveryMode || recoveryChallenge) && (
                  <div className="admin-login-field-group">
                    <label htmlFor={recoveryMode ? "admin-new-password" : "admin-password"}>{recoveryMode ? "MẬT KHẨU MỚI (16–18 SỐ)" : "MẬT KHẨU BẢO MẬT"}</label>
                    <div className="admin-login-input-box">
                      <Lock className="admin-login-field-icon" aria-hidden="true" />
                      <input
                        id={recoveryMode ? "admin-new-password" : "admin-password"}
                        type={showPassword ? "text" : "password"}
                        inputMode={recoveryMode ? "numeric" : undefined}
                        pattern={recoveryMode ? "[0-9]{16,18}" : undefined}
                        value={recoveryMode ? newPassword : password}
                        onChange={(e) => recoveryMode ? setNewPassword(e.target.value.replace(/\D/g, "").slice(0, 18)) : setPassword(e.target.value)}
                        placeholder={recoveryMode ? "16–18 chữ số" : "••••••••"}
                        required
                      />
                      <button
                        type="button"
                        className="admin-login-pwd-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {(loginChallenge || recoveryChallenge) && (
                  <div className="admin-login-field-group">
                    <label htmlFor="admin-recovery-code">MÃ XÁC THỰC EMAIL</label>
                    <div className="admin-login-input-box">
                      <ShieldCheck className="admin-login-field-icon" aria-hidden="true" />
                      <input id="admin-recovery-code" type="text" inputMode="numeric" pattern="[0-9]{8}" maxLength="8" value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="8 chữ số" autoComplete="one-time-code" required />
                    </div>
                  </div>
                )}

                {recoveryMode && recoveryChallenge && (
                  <>
                    <div className="admin-login-field-group">
                      <label htmlFor="admin-confirm-password">NHẬP LẠI MẬT KHẨU MỚI</label>
                      <div className="admin-login-input-box">
                        <Lock className="admin-login-field-icon" aria-hidden="true" />
                        <input id="admin-confirm-password" type={showPassword ? "text" : "password"} inputMode="numeric" pattern="[0-9]{16,18}" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value.replace(/\D/g, "").slice(0, 18))} placeholder="Nhập lại dãy số" required />
                      </div>
                    </div>
                  </>
                )}

                <div className="admin-login-hint-strip">
                  <span>{loginChallenge ? "Mã chỉ dùng một lần và hết hạn sau 10 phút." : recoveryMode ? (recoveryChallenge ? "Nhập mã email cùng mật khẩu mới để hoàn tất." : "Mã khôi phục dùng một lần sẽ được gửi tới email quản trị.") : "Mật khẩu phải là dãy số ngẫu nhiên và không dùng lại ở nơi khác."}</span>
                </div>

                <div className="admin-login-actions-group">
                  <button type="submit" className="visit-link admin-login-submit-btn" disabled={isSubmitting}>
                    <ShieldCheck size={18} />
                    <KineticRollText>{isSubmitting ? "ĐANG XỬ LÝ..." : loginChallenge ? "XÁC NHẬN MÃ" : recoveryMode ? (recoveryChallenge ? "ĐẶT LẠI MẬT KHẨU" : "GỬI MÃ KHÔI PHỤC") : "XÁC NHẬN ĐĂNG NHẬP"}</KineticRollText>
                  </button>
                  <button type="button" className="admin-login-recovery-toggle" onClick={toggleRecoveryMode}>{loginChallenge || recoveryMode ? "Quay lại đăng nhập" : "Quên mật khẩu?"}</button>
                </div>
              </form>

              <footer className="admin-login-card-footer">
                <span>BẢO MẬT HỆ THỐNG • CÔNG NGHỆ THÔN MÊ LINH</span>
              </footer>
            </div>
          </div>
        </div>

        {/* Footer Bar inside Liquid Curtain */}
        <footer className="curtain-menu-footer">
          <span className="curtain-footer-copy curtain-footer-roll">
            <span className="curtain-footer-text curtain-footer-text-white">CỔNG BẢO MẬT BAN QUẢN TRỊ TRANG WEB</span>
            <span className="curtain-footer-text curtain-footer-text-green" aria-hidden="true">CỔNG BẢO MẬT BAN QUẢN TRỊ TRANG WEB</span>
          </span>
          <div className="curtain-social-links">
            <span className="curtain-footer-tag">SINCE 2026</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
