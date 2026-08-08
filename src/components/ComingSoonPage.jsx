import React from "react";
import { ArrowLeft, ArrowUpRight, X, Sparkles } from "lucide-react";
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
    <span className="site-loader-mark coming-soon-loader-mark">
      <svg aria-hidden="true" className="site-loader-signature" viewBox="0 0 470 128">
        <g className="sig-guide">
          <path d="M 35,34 H 105" />
          <path d="M 70,34 V 94" />
          <path d="M 130,34 V 94" />
          <path d="M 130,64 H 180" />
          <path d="M 180,34 V 94" />
          <path d="M 235,34 C 200,34 200,94 235,94 C 270,94 270,34 235,34 Z" />
          <path d="M 220,22 L 235,10 L 250,22" />
          <path d="M 295,94 V 34 L 350,94 V 34" />
          <path d="M 385,34 H 430 L 406,60 C 428,60 436,72 436,83 C 436,94 416,94 385,94" />
          <path d="M 35,110 H 435" />
        </g>
        <g className="sig-draw">
          <path d="M 35,34 H 105" pathLength="1" className="sig-path sig-t" />
          <path d="M 70,34 V 94" pathLength="1" className="sig-path sig-t" />
          <path d="M 130,34 V 94" pathLength="1" className="sig-path sig-h" />
          <path d="M 130,64 H 180" pathLength="1" className="sig-path sig-h" />
          <path d="M 180,34 V 94" pathLength="1" className="sig-path sig-h" />
          <path d="M 235,34 C 200,34 200,94 235,94 C 270,94 270,34 235,34 Z" pathLength="1" className="sig-path sig-o" />
          <path d="M 220,22 L 235,10 L 250,22" pathLength="1" className="sig-path sig-o" />
          <path d="M 295,94 V 34 L 350,94 V 34" pathLength="1" className="sig-path sig-n" />
          <path d="M 385,34 H 430 L 406,60 C 428,60 436,72 436,83 C 436,94 416,94 385,94" pathLength="1" className="sig-path sig-3" />
          <path d="M 35,110 H 435" pathLength="1" className="sig-path sig-line" />
        </g>
      </svg>
    </span>
  );
}

export default function ComingSoonPage({
  title = "Coming soon!",
  description = "This page is under construction • Không gian này đang được biên tập & hoàn thiện"
}) {
  const { content } = useSiteContent();
  const { siteName, tagline } = content.settings;

  const socialLinks = [
    { name: "TikTok", href: "#dong-hanh", icon: "🎵" },
    { name: "Instagram", href: "#dong-hanh", icon: "📸" },
    { name: "Facebook", href: "#dong-hanh", icon: "🌐" },
    { name: "YouTube", href: "#dong-hanh", icon: "▶" },
    { name: "Mê Linh", href: "#dong-hanh", icon: "🏛" },
  ];

  return (
    <div className="coming-soon-wrapper">
      <div className="coming-soon-window">
        {/* Top Header Navigation Bar */}
        <header className="coming-soon-window-header">
          <div className="coming-soon-brand">
            <YouthUnionEmblem size={24} />
            <span className="coming-soon-brand-name">{siteName}</span>
            <span className="coming-soon-brand-sep">|</span>
            <span className="coming-soon-brand-tag">{tagline}</span>
          </div>

          <nav className="coming-soon-nav" aria-label="Menu chuyển trang">
            <a href="#home"><KineticRollText>Trang chủ</KineticRollText></a>
            <a href="#cau-chuyen"><KineticRollText>Câu chuyện</KineticRollText></a>
            <a href="#nhung-mua"><KineticRollText>Nhịp sống</KineticRollText></a>
          </nav>

          <div className="coming-soon-header-actions">
            <a className="coming-soon-talk-link" href="#lien-he">
              <KineticRollText>Ghé Mê Linh</KineticRollText>
              <ArrowUpRight size={14} />
            </a>
            <span className="coming-soon-brand-sep">|</span>
            <a className="coming-soon-close-btn" href="#home" title="Đóng & Về trang chủ" aria-label="Đóng trang">
              <X size={18} />
            </a>
          </div>
        </header>

        {/* Center Stage with Semicircular Dome Glow & Animated SVG Line Drawing */}
        <main className="coming-soon-stage">
          {/* Luminous Warm Radial Sunburst Glow */}
          <div className="coming-soon-dome-glow" aria-hidden="true" />

          {/* Semicircular Arc Dome SVG with Animated Stroke Line Drawing */}
          <svg className="coming-soon-dome-svg" viewBox="0 0 700 400" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            <path
              className="coming-soon-dome-arc-guide"
              d="M 50 380 A 300 300 0 0 1 650 380"
            />
            <path
              className="coming-soon-dome-arc-draw"
              d="M 50 380 A 300 300 0 0 1 650 380"
              pathLength="1"
            />
          </svg>

          {/* Inner Content inside Animated Semicircle */}
          <div className="coming-soon-stage-content">
            {/* Signature Drawing Stroke Animation ("hiệu ứng vẽ như loading") */}
            <div className="coming-soon-sig-box">
              <LoaderSignature />
            </div>

            <h1 className="coming-soon-hero-title">{title}</h1>
            <p className="coming-soon-hero-sub">{description}</p>

            <div className="coming-soon-pulse-divider">
              <span className="coming-soon-pulse-line" />
            </div>

            <div className="coming-soon-social-strip">
              <p className="coming-soon-social-title">Stay in the loop — follow us on social media</p>
              <div className="coming-soon-social-icons">
                {socialLinks.map((item) => (
                  <a className="coming-soon-social-pill" href={item.href} key={item.name} title={item.name} aria-label={item.name}>
                    <span>{item.icon}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Bottom Bar: Return to Homepage */}
        <footer className="coming-soon-window-footer">
          <a className="coming-soon-return-link" href="#home">
            <ArrowLeft size={15} />
            <KineticRollText>Return to Homepage</KineticRollText>
          </a>
        </footer>
      </div>
    </div>
  );
}
