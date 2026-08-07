import { useEffect, useRef } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import AdaptiveImage from "./AdaptiveImage.jsx";
import RevealLine from "./RevealLine.jsx";
import { useSiteContent } from "../content/SiteContentProvider.jsx";

const NAV_ITEMS = [
  ["Trang chủ", "#home"],
  ["Câu chuyện", "#cau-chuyen"],
  ["Nhịp sống", "#nhung-mua"],
  ["Tư liệu", "#tu-lieu"],
  ["Cộng đồng", "#dong-hanh"],
];

const NETWORK_ITEMS = [
  ["Mê Linh", "#home"],
  ["Hà Nội", "#lien-he"],
  ["Kết nối", "#dong-hanh"],
];

const SOCIAL_ITEMS = [
  ["Facebook", "#dong-hanh"],
  ["Instagram", "#dong-hanh"],
  ["YouTube", "#dong-hanh"],
  ["TikTok", "#dong-hanh"],
];

function KineticRollText({ children }) {
  const text = String(children);
  return (
    <span className="closing-kinetic-roll">
      <span className="closing-kinetic-white">{text}</span>
      <span className="closing-kinetic-green" aria-hidden="true">{text}</span>
    </span>
  );
}

export default function ClosingSection() {
  const { content } = useSiteContent();
  const { settings, fullBleedArrival, communityPartners } = content;
  const nameLines = settings.siteName.split(" ");
  const organizations = communityPartners.organizations;
  const marqueeRef = useRef(null);

  // Smooth continuous infinite marquee sliding for the bottom logo strip
  useEffect(() => {
    let animationFrameId;
    let position = 0;
    let lastTime = performance.now();

    const loop = (timestamp) => {
      const delta = Math.min(timestamp - lastTime, 32);
      lastTime = timestamp;

      if (marqueeRef.current) {
        const firstGroup = marqueeRef.current.firstElementChild;
        if (firstGroup) {
          const groupWidth = firstGroup.scrollWidth || firstGroup.getBoundingClientRect().width;

          if (groupWidth > 0) {
            position += 1.4 * (delta / 16.66);
            if (position >= groupWidth) {
              position -= groupWidth;
            }
            marqueeRef.current.style.transform = `translate3d(-${position.toFixed(2)}px, 0, 0)`;
          }
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const renderPartnerGroup = (isClone = false) =>
    organizations.map((organization, idx) => (
      <span className="closing-partner" key={`${organization.id}-${isClone ? "clone" : "orig"}-${idx}`} title={organization.label}>
        {organization.logo ? (
          <img src={organization.logo} alt={organization.logoAlt || organization.label} loading="lazy" decoding="async" />
        ) : (
          <span className="closing-partner-badge">{organization.mark}</span>
        )}
      </span>
    ));

  return (
    <section className="closing-section" id="ket-lai" aria-labelledby="closing-title">
      {/* 1. Full-bleed transition area (No green side bars) */}
      <div className="closing-transition">
        <p className="closing-transition-kicker">
          <RevealLine>CỘNG ĐỒNG / MÊ LINH</RevealLine>
        </p>
        <h2>
          <RevealLine>Theo dõi Mê Linh</RevealLine>
        </h2>
        <nav className="closing-social-links" aria-label="Mạng xã hội của Mê Linh">
          {SOCIAL_ITEMS.map(([label, href]) => (
            <a href={href} key={label}>
              <KineticRollText>{label}</KineticRollText>
            </a>
          ))}
        </nav>
      </div>

      {/* 2. Lime Green Framed Shell Area */}
      <div className="closing-shell-container">
        <div className="closing-shell">
          <span className="closing-shell-cap" aria-hidden="true" />
          <div className="closing-topbar">
            <a className="closing-wordmark" href="#home" aria-label={`${settings.siteName} - về trang đầu`}>
              <span>{nameLines[0]}<br />{nameLines.slice(1).join(" ")}</span>
              <small>{settings.tagline}</small>
            </a>
            <a className="closing-visit-link" href="#lien-he">
              <MapPin aria-hidden="true" />
              <KineticRollText>GHÉ MÊ LINH</KineticRollText>
            </a>
          </div>

          <div className="closing-stage">
            <p className="closing-kicker">
              <RevealLine>{`MỘT NƠI ĐỂ TRỞ VỀ / ${settings.tagline}`}</RevealLine>
            </p>
            <h2 id="closing-title">
              <RevealLine><span>LUÔN CÓ</span></RevealLine>
              <RevealLine direction="left"><em>MỘT LỐI VỀ.</em></RevealLine>
            </h2>

            <figure className="closing-portrait">
              <AdaptiveImage
                src={fullBleedArrival.imageSrc}
                alt={fullBleedArrival.imageAlt}
                imagePosition={fullBleedArrival.imagePosition}
                imageVariant="medium"
                sizes="(max-width: 680px) 72vw, 34vw"
              />
              <figcaption>{settings.siteName} <span>•</span> {settings.tagline}</figcaption>
            </figure>

            <nav className="closing-nav" aria-label="Điều hướng chân trang">
              <span className="closing-nav-label">TRANG</span>
              {NAV_ITEMS.map(([label, href]) => (
                <a href={href} key={label}>
                  <KineticRollText>{label}</KineticRollText>
                </a>
              ))}
            </nav>

            <nav className="closing-network" aria-label="Kết nối Mê Linh">
              <span className="closing-nav-label">THEO DÕI</span>
              {NETWORK_ITEMS.map(([label, href]) => (
                <a href={href} key={label}>
                  <KineticRollText>{label}</KineticRollText>
                </a>
              ))}
            </nav>

            <a className="closing-contact" href="#dong-hanh">
              <KineticRollText>KẾT NỐI CÙNG MÊ LINH</KineticRollText>
              <ArrowUpRight aria-hidden="true" />
            </a>

            {/* Continuous Infinite Marquee Logo Strip at Bottom */}
            <div className="closing-partners-marquee-container" aria-label="Các đơn vị đồng hành">
              <div className="closing-partners-marquee-track" ref={marqueeRef}>
                <div className="closing-partners-group">{renderPartnerGroup(false)}</div>
                <div className="closing-partners-group" aria-hidden="true">{renderPartnerGroup(true)}</div>
                <div className="closing-partners-group" aria-hidden="true">{renderPartnerGroup(true)}</div>
                <div className="closing-partners-group" aria-hidden="true">{renderPartnerGroup(true)}</div>
              </div>
            </div>
          </div>

          <div className="closing-bottomline">
            <span>© 2026 {settings.siteName}. {settings.footerText}.</span>
            <span>
              <a href="#tu-lieu"><KineticRollText>TƯ LIỆU</KineticRollText></a>
              <a href="#dong-hanh"><KineticRollText>LIÊN HỆ</KineticRollText></a>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
