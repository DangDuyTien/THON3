import React, { useEffect, useRef, useState } from "react";
import { MapPin, Menu, X } from "lucide-react";
import AdaptiveImage from "./AdaptiveImage.jsx";
import YouthUnionEmblem from "./icons/YouthUnionEmblem.jsx";
import { useSiteContent } from "../content/SiteContentProvider.jsx";

function KineticRollText({ children }) {
  const text = String(children);
  return (
    <span className="closing-kinetic-roll">
      <span className="closing-kinetic-white">{text}</span>
      <span className="closing-kinetic-green" aria-hidden="true">{text}</span>
    </span>
  );
}

function IconRoll({ isOpen }) {
  return (
    <span className="header-icon-roll">
      <span className="header-icon-primary">{isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</span>
      <span className="header-icon-hover" aria-hidden="true">{isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</span>
    </span>
  );
}

export default function CurtainMenu({ isOpen, onClose }) {
  const { content } = useSiteContent();
  const { siteName, tagline } = content.settings;
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState(false);
  const [curveD, setCurveD] = useState("M 0 0 L 100 0 L 100 0 Q 50 0 0 0 Z");
  const [mouseY, setMouseY] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setAnimating(true);
      let start = null;
      const duration = 1250;

      const animateOpen = (timestamp) => {
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
        const p = Math.min(elapsed / duration, 1);
        
        const easeP = 1 - Math.pow(1 - p, 3);
        const bulge = Math.sin(p * Math.PI) * 28;
        const currentY = easeP * 100;
        const curveY = Math.min(currentY + bulge, 100);

        setCurveD(`M 0 0 L 100 0 L 100 ${currentY} Q 50 ${curveY} 0 ${currentY} Z`);

        if (p < 1) {
          rafRef.current = requestAnimationFrame(animateOpen);
        } else {
          setCurveD("M 0 0 L 100 0 L 100 100 Q 50 100 0 100 Z");
          setAnimating(false);
        }
      };

      rafRef.current = requestAnimationFrame(animateOpen);
    } else if (visible) {
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
          setVisible(false);
          setAnimating(false);
        }
      };

      rafRef.current = requestAnimationFrame(animateClose);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseY(relY);
  };

  const handleMouseLeave = () => {
    setMouseY(0);
  };

  if (!visible && !isOpen) return null;

  const menuLinks = [
    { id: 0, title: "TRANG CHỦ", href: "#home" },
    { id: 1, title: "CÂU CHUYỆN", href: "#cau-chuyen" },
    { id: 2, title: "NHỊP SỐNG", href: "#nhung-mua" },
    { id: 3, title: "BẢN ĐỒ", href: "#ban-do" },
    { id: 4, title: "CỘNG ĐỒNG", href: "#dong-hanh" },
    { id: 5, title: "KHO LƯU TRỮ", href: "#tu-lieu" },
    { id: 6, title: "THEO DÕI MÊ LINH", href: "#ket-lai" },
  ];

  const leftColumnPhotos = [
    { id: "1", src: "/assets/village-hero.jpg" },
    { id: "3", src: "/assets/village-hero.jpg" },
  ];

  const rightColumnPhotos = [
    { id: "2", src: "/assets/village-hero.jpg" },
    { id: "4", src: "/assets/village-hero.jpg" },
  ];

  return (
    <div className={`curtain-menu-overlay${isOpen ? " is-open" : ""}${animating ? " is-animating" : ""}`} id="mobile-menu">
      <svg className="curtain-svg-clip" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <clipPath id="curtain-clip-path" clipPathUnits="objectBoundingBox">
            <path d={curveD.replace(/(\d+(\.\d+)?)/g, (m) => (parseFloat(m) / 100).toFixed(4))} />
          </clipPath>
        </defs>
      </svg>

      <div className="curtain-menu-content" style={{ clipPath: "url(#curtain-clip-path)" }}>
        {/* Organic Background Contour Waves inside Menu */}
        <svg className="curtain-contour-bg" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path d="M-100 140 Q 300 380, 700 180 T 1540 320" stroke="rgba(0, 240, 255, 0.16)" strokeWidth="1.8" />
          <path d="M-100 320 Q 400 120, 800 580 T 1540 420" stroke="rgba(0, 102, 255, 0.20)" strokeWidth="2.4" />
          <path d="M-100 520 Q 350 720, 900 260 T 1540 620" stroke="rgba(0, 240, 255, 0.14)" strokeWidth="1.4" />
          <path d="M-100 720 Q 500 480, 850 820 T 1540 720" stroke="rgba(0, 162, 255, 0.18)" strokeWidth="2.0" />
        </svg>

        {/* Header Bar inside Curtain Menu */}
        <header className="curtain-menu-header">
          <a className="curtain-brand-lando" href="#home" onClick={onClose}>
            <span>{siteName}</span>
            <span>{tagline}</span>
          </a>

          <div className="curtain-header-actions">
            <a className="visit-link" href="/lien-he" onClick={onClose}>
              <MapPin aria-hidden="true" />
              <KineticRollText>GHÉ THĂM</KineticRollText>
            </a>
            <button className="menu-button" type="button" onClick={onClose} aria-label="Đóng menu">
              <IconRoll isOpen={true} />
              <span className="sr-only">Đóng menu</span>
            </button>
          </div>
        </header>

        {/* Main Body Grid */}
        <div className="curtain-menu-body">
          {/* Left Side: Clean 2x2 Staggered Photo Grid */}
          <div
            className="curtain-photos-container"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <div
              className="curtain-photos-col curtain-photos-col-left"
              style={{ transform: `translate3d(0, ${-mouseY * 90}px, 0)` }}
            >
              {leftColumnPhotos.map((photo) => (
                <div className="curtain-photo-card" key={photo.id}>
                  <AdaptiveImage src={photo.src} alt="" />
                </div>
              ))}
            </div>

            <div
              className="curtain-photos-col curtain-photos-col-right"
              style={{ transform: `translate3d(0, ${mouseY * 90}px, 0)` }}
            >
              {rightColumnPhotos.map((photo) => (
                <div className="curtain-photo-card" key={photo.id}>
                  <AdaptiveImage src={photo.src} alt="" />
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Clean Text Slide Down Hover (NO BOX/FRAME) */}
          <div className="curtain-right-panel">
            <nav className="curtain-nav-stacked" aria-label="Điều hướng menu">
              {menuLinks.map((link, idx) => (
                <a
                  className={`curtain-nav-item${activeIdx === idx ? " is-active" : ""}`}
                  href={link.href}
                  key={link.id}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={onClose}
                >
                  <span className="curtain-nav-roll">
                    <span className="curtain-nav-text curtain-nav-text-white">{link.title}</span>
                    <span className="curtain-nav-text curtain-nav-text-green" aria-hidden="true">{link.title}</span>
                  </span>
                </a>
              ))}
            </nav>

            <div className="curtain-crest-section">
              <div className="curtain-crest-icon" aria-hidden="true">
                <YouthUnionEmblem size={44} />
              </div>
              <span className="curtain-crest-tag">ĐOÀN THANH NIÊN CS HỒ CHÍ MINH • THÔN MÊ LINH</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="curtain-menu-footer">
          <span className="curtain-footer-copy curtain-footer-roll">
            <span className="curtain-footer-text curtain-footer-text-white">THÔNG TIN LIÊN HỆ & TRUYỀN THÔNG</span>
            <span className="curtain-footer-text curtain-footer-text-green" aria-hidden="true">THÔNG TIN LIÊN HỆ & TRUYỀN THÔNG</span>
          </span>
          <div className="curtain-social-links">
            <a href="https://tiktok.com" target="_blank" rel="noreferrer" className="curtain-footer-roll">
              <span className="curtain-footer-text curtain-footer-text-white">TIKTOK</span>
              <span className="curtain-footer-text curtain-footer-text-green" aria-hidden="true">TIKTOK</span>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="curtain-footer-roll">
              <span className="curtain-footer-text curtain-footer-text-white">INSTAGRAM</span>
              <span className="curtain-footer-text curtain-footer-text-green" aria-hidden="true">INSTAGRAM</span>
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className="curtain-footer-roll">
              <span className="curtain-footer-text curtain-footer-text-white">YOUTUBE</span>
              <span className="curtain-footer-text curtain-footer-text-green" aria-hidden="true">YOUTUBE</span>
            </a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="curtain-footer-roll">
              <span className="curtain-footer-text curtain-footer-text-white">FACEBOOK</span>
              <span className="curtain-footer-text curtain-footer-text-green" aria-hidden="true">FACEBOOK</span>
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
