import { useEffect, useRef, useState } from "react";
import "../styles-coming-soon.css";
import { ArrowLeft, ArrowUpRight, MapPin, X } from "lucide-react";
import { useSiteContent } from "../content/SiteContentProvider.jsx";
import { getTransitionTitle } from "../route-transition.js";

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

function EditorialSignature() {
  return (
    <span className="coming-soon-hero-signature" aria-hidden="true">
      <SiteLoaderMark />
    </span>
  );
}

export default function ComingSoonPage({ title = "Coming soon!", description = "Không gian này đang được biên tập và hoàn thiện.", heroRevealReady = false }) {
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
  const organizations = content.communityPartners.organizations;
  const sectionTitle = getTransitionTitle(window.location.href, "KHÔNG GIAN MỚI");

  const renderPartnerGroup = (duplicate = false) => (
    <div className="coming-soon-partner-group" aria-hidden={duplicate || undefined}>
      {organizations.map((organization) => (
        <span className="coming-soon-partner" role={duplicate ? undefined : "listitem"} key={`${organization.id}-${duplicate ? "duplicate" : "original"}`}>
          <img src={organization.logo} alt="" width="160" height="80" loading="lazy" decoding="async" />
          <span>{organization.label}</span>
        </span>
      ))}
    </div>
  );


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
          <EditorialSignature />

          <div className="coming-soon-editorial">
            <div className="coming-soon-heading-block">
              <p className="coming-soon-kicker"><span /> {sectionTitle}</p>
              <h1 id="coming-soon-title" aria-label={title}>
                <span>COMING</span>
                <em>SOON!</em>
              </h1>
            </div>

            <div className="coming-soon-information">
              <p className="coming-soon-description">{description}</p>
              <dl className="coming-soon-meta">
                <div><dt>Không gian</dt><dd>{sectionTitle}</dd></div>
                <div><dt>Trạng thái</dt><dd>Đang biên tập</dd></div>
                <div><dt>Cập nhật</dt><dd>Khi nội dung sẵn sàng</dd></div>
              </dl>
            </div>
          </div>

          <div className="coming-soon-partners">
            <p className="coming-soon-follow">CỘNG ĐỒNG / ĐỒNG HÀNH CÙNG MÊ LINH</p>
            <div className="coming-soon-partner-loop" role="list" aria-label="Các tổ chức đồng hành">
              <div className="coming-soon-partner-track">
                {renderPartnerGroup()}
                {renderPartnerGroup(true)}
              </div>
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
