import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, MapPin, Music2, X } from "lucide-react";
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

function LoaderSignature() {
  return (
    <span className="site-loader-mark coming-soon-loader-mark" aria-hidden="true">
      <svg className="site-loader-signature" viewBox="0 0 470 128">
        <g className="sig-guide">
          <path d="M 35,34 H 105" /><path d="M 70,34 V 94" /><path d="M 130,34 V 94" />
          <path d="M 130,64 H 180" /><path d="M 180,34 V 94" />
          <path d="M 235,34 C 200,34 200,94 235,94 C 270,94 270,34 235,34 Z" />
          <path d="M 220,22 L 235,10 L 250,22" /><path d="M 295,94 V 34 L 350,94 V 34" />
          <path d="M 385,34 H 430 L 406,60 C 428,60 436,72 436,83 C 436,94 416,94 385,94" />
          <path d="M 35,110 H 435" />
        </g>
        <g className="sig-draw">
          <path d="M 35,34 H 105" pathLength="1" className="sig-path" /><path d="M 70,34 V 94" pathLength="1" className="sig-path" />
          <path d="M 130,34 V 94" pathLength="1" className="sig-path" /><path d="M 130,64 H 180" pathLength="1" className="sig-path" />
          <path d="M 180,34 V 94" pathLength="1" className="sig-path" /><path d="M 235,34 C 200,34 200,94 235,94 C 270,94 270,34 235,34 Z" pathLength="1" className="sig-path" />
          <path d="M 220,22 L 235,10 L 250,22" pathLength="1" className="sig-path" /><path d="M 295,94 V 34 L 350,94 V 34" pathLength="1" className="sig-path" />
          <path d="M 385,34 H 430 L 406,60 C 428,60 436,72 436,83 C 436,94 416,94 385,94" pathLength="1" className="sig-path" /><path d="M 35,110 H 435" pathLength="1" className="sig-path" />
        </g>
      </svg>
    </span>
  );
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
  const socialLinks = [
    { name: "TikTok", href: "https://tiktok.com", icon: Music2 },
    { name: "Instagram", href: "https://instagram.com", icon: Music2 },
    { name: "X", href: "https://x.com", icon: X },
    { name: "Facebook", href: "https://facebook.com", icon: Music2 },
    { name: "YouTube", href: "https://youtube.com", icon: Music2 },
  ];

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
            <h1 id="coming-soon-title" style={{ "--coming-delay": "420ms" }}>Coming soon!</h1>
            <p className="coming-soon-description" style={{ "--coming-delay": "620ms" }}>{description}</p>
            <span className="coming-soon-divider" aria-hidden="true" style={{ "--coming-delay": "820ms" }} />
            <p className="coming-soon-follow" style={{ "--coming-delay": "960ms" }}>THEO DÕI NHỮNG CÂU CHUYỆN MỚI TỪ MÊ LINH</p>
            <div className="coming-soon-social-icons" aria-label="Mạng xã hội" style={{ "--coming-delay": "1040ms" }}>
              {socialLinks.map(({ name, href, icon: Icon }) => (
                <a className="coming-soon-social-pill" href={href} key={name} target="_blank" rel="noreferrer" aria-label={name} title={name}><Icon size={14} aria-hidden="true" /></a>
              ))}
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
