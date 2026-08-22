import React from "react";
import { ArrowLeft, Home } from "lucide-react";
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

export default function NotFoundPage() {
  const { content } = useSiteContent();
  const { siteName, tagline } = content.settings;

  return (
    <div className="coming-soon-container not-found-container">
      {/* Background Organic Ambient Waves */}
      <svg className="coming-soon-contour-bg" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d="M-100 180 Q 350 420, 750 200 T 1540 350" stroke="rgba(0, 102, 255, 0.22)" strokeWidth="2" />
        <path d="M-100 380 Q 450 160, 850 620 T 1540 450" stroke="rgba(0, 162, 255, 0.28)" strokeWidth="2.4" />
      </svg>

      {/* Top Brand Bar */}
      <header className="coming-soon-header">
        <a className="curtain-brand-lando" href="/">
          <span>{siteName}</span>
          <span>{tagline}</span>
        </a>

        <a className="visit-link" href="/" title="Trở về trang chủ">
          <ArrowLeft aria-hidden="true" />
          <KineticRollText>TRANG CHỦ</KineticRollText>
        </a>
      </header>

      {/* Main Content Card */}
      <main className="coming-soon-body">
        <div className="coming-soon-card">
          <div className="coming-soon-crest">
            <YouthUnionEmblem size={64} />
            <div className="coming-soon-badge not-found-badge">
              <span>LỖI 404 • KHÔNG TÌM THẤY TRANG</span>
            </div>
          </div>

          <h1 className="coming-soon-title">ĐƯỜNG LÀNG LỆCH HƯỚNG</h1>
          <p className="coming-soon-description">Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển sang một lối đi khác trên website.</p>

          <div className="coming-soon-actions">
            <a className="visit-link coming-soon-btn-primary" href="/">
              <Home size={16} />
              <KineticRollText>QUAY VỀ TRANG CHỦ</KineticRollText>
            </a>
          </div>

          <footer className="coming-soon-footer">
            <span>BẢO MẬT & ĐIỀU HƯỚNG • {siteName} {tagline}</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
