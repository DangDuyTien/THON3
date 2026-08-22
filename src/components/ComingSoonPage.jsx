import { useEffect, useRef, useState } from "react";
import "../styles-coming-soon.css";
import { ArrowLeft, ArrowUpRight, MapPin, X } from "lucide-react";
import YouthUnionEmblem from "./icons/YouthUnionEmblem.jsx";
import { useSiteContent } from "../content/SiteContentProvider.jsx";

import SiteLoaderMark from "./SiteLoaderMark.jsx";

function KineticRollText({ children }) {
  const text = String(children);
  return (
    <span className="closing-kinetic-roll">
      <span className="closing-kinetic-white">{text}</span>
      <span className="closing-kinetic-green" aria-hidden="true">{text}</span>
    </span>
  );
}

function LoaderSignature() {
  return <SiteLoaderMark />;
}

export default function ComingSoonPage({ description = "Không gian này đang được biên tập và hoàn thiện.", heroRevealReady = false }) {
  const [entered, setEntered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(media.matches);
    updateMotion();
    media.addEventListener("change", updateMotion);
    return () => media.removeEventListener("change", updateMotion);
  }, []);

  useEffect(() => {
    if (!heroRevealReady && !reducedMotion) return undefined;
    setEntered(false);
    const frame = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(frame);
  }, [heroRevealReady, reducedMotion]);

  const { content } = useSiteContent();
  const { siteName, tagline } = content.settings;


  return (
    <div className={`coming-soon-wrapper${entered || reducedMotion ? " is-entered" : ""}`}>
      <div className="coming-soon-window">
        <header className="coming-soon-page-header">
          <a className="coming-soon-wordmark" href="/" aria-label={`${siteName} - về trang chủ`}>
            <span className="coming-soon-wordmark-name">{siteName}</span>
            <span className="coming-soon-wordmark-tag">{tagline}</span>
          </a>
          <div className="coming-soon-header-actions">
            <a className="visit-link" href="/lien-he"><MapPin aria-hidden="true" /><KineticRollText>Ghé thăm</KineticRollText></a>
            <a className="menu-button coming-soon-close-btn" href="/" aria-label="Về trang chủ" title="Về trang chủ"><X aria-hidden="true" /></a>
          </div>
        </header>

        <main className="coming-soon-main" aria-labelledby="coming-soon-title">
          <svg className="coming-soon-motion-lines" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <g className="coming-soon-motion-ring coming-soon-motion-ring-a">
              <ellipse cx="500" cy="330" rx="420" ry="250" />
            </g>
            <g className="coming-soon-motion-ring coming-soon-motion-ring-b">
              <ellipse cx="490" cy="340" rx="330" ry="205" />
            </g>
            <g className="coming-soon-motion-ring coming-soon-motion-ring-c">
              <ellipse cx="520" cy="318" rx="235" ry="150" />
            </g>
            <g className="coming-soon-motion-line coming-soon-motion-line-a">
              <path d="M -80 178 C 180 70 310 250 520 150 S 850 80 1080 220" />
            </g>
            <g className="coming-soon-motion-line coming-soon-motion-line-b">
              <path d="M -80 470 C 180 570 340 390 545 475 S 850 575 1080 420" />
            </g>
            <g className="coming-soon-motion-ring coming-soon-motion-ring-d">
              <ellipse cx="820" cy="170" rx="105" ry="70" />
            </g>
          </svg>
          <div className="coming-soon-contour coming-soon-contour-one" aria-hidden="true" />
          <div className="coming-soon-contour coming-soon-contour-two" aria-hidden="true" />
          <div className="coming-soon-copy">
            <p className="coming-soon-kicker" style={{ "--coming-delay": "80ms" }}><span /> THÔNG TIN ĐANG ĐƯỢC CHUẨN BỊ</p>
            <LoaderSignature />
            <h1 id="coming-soon-title" className="cs-draw-title" style={{ "--coming-delay": "420ms" }} aria-label="Coming soon!">
              <svg className="cs-draw-svg" viewBox="0 0 820 100" aria-hidden="true">
                <text className="cs-draw-text cs-draw-text-fill" x="410" y="78" textAnchor="middle">Coming soon!</text>
                <text className="cs-draw-text cs-draw-text-stroke" x="410" y="78" textAnchor="middle">Coming soon!</text>
              </svg>
            </h1>
            <p className="coming-soon-description" style={{ "--coming-delay": "620ms" }}>{description}</p>
            <span className="coming-soon-divider" aria-hidden="true" style={{ "--coming-delay": "820ms" }} />
            <p className="coming-soon-follow" style={{ "--coming-delay": "960ms" }}>THEO DÕI NHỮNG CÂU CHUYỆN MỚI TỪ MÊ LINH</p>
            <div className="coming-soon-youth-icons" aria-label="Các trường và tổ chức đồng hành" style={{ "--coming-delay": "1040ms" }}>
              <span className="cs-youth-flag cs-youth-logo-card" title="Trường THPT Tiền Phong">
                <span className="cs-youth-logo-monogram" aria-hidden="true">TP</span>
                <span className="cs-youth-logo-label">THPT TIỀN PHONG</span>
              </span>
              <span className="cs-youth-flag cs-youth-logo-card" title="Đoàn TNCS Hồ Chí Minh">
                <img src="/assets/doan-tncs-logo-160.webp" alt="Biểu trưng Đoàn TNCS Hồ Chí Minh" width="72" height="48" loading="lazy" />
                <span className="cs-youth-logo-label">ĐOÀN TNCS</span>
              </span>
              <span className="cs-youth-flag cs-youth-logo-card" title="Trường THPT Mê Linh">
                <span className="cs-youth-logo-monogram cs-youth-logo-monogram-lime" aria-hidden="true">ML</span>
                <span className="cs-youth-logo-label">THPT MÊ LINH</span>
              </span>
            </div>
          </div>
        </main>

        <footer className="coming-soon-page-footer">
          <a className="coming-soon-return-link" href="/"><ArrowLeft size={15} aria-hidden="true" /><KineticRollText>VỀ TRANG CHỦ</KineticRollText></a>
          <span className="coming-soon-index">THÔN 3 / MÊ LINH</span>
          <a className="coming-soon-footer-link" href="/dong-hanh"><KineticRollText>ĐỒNG HÀNH</KineticRollText><ArrowUpRight size={13} aria-hidden="true" /></a>
        </footer>
      </div>
    </div>
  );
}
