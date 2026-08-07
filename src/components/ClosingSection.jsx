import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import AdaptiveImage from "./AdaptiveImage.jsx";
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
  const closingHeadline = Array.isArray(fullBleedArrival.headline) && fullBleedArrival.headline.length >= 2
    ? fullBleedArrival.headline
    : ["LUÔN CÓ", "MỘT LỐI VỀ."];
  const closingImageSrc = fullBleedArrival.portraitSrc || fullBleedArrival.imageSrc;
  const closingImageAlt = fullBleedArrival.portraitAlt || fullBleedArrival.imageAlt;
  const closingImagePosition = fullBleedArrival.imagePosition || "center 58%";
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
            position -= delta * 0.045; // Smooth 45px/sec drift speed
            if (position <= -groupWidth) {
              position += groupWidth;
            }
            marqueeRef.current.style.transform = `translate3d(${position}px, 0, 0)`;
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
      {/* Top Section Transition Kicker */}
      <div className="closing-transition">
        <p className="closing-transition-kicker">CỘNG ĐỒNG / MÊ LINH</p>
        <h2>Theo dõi Mê Linh</h2>
        <nav className="closing-social-links" aria-label="Mạng xã hội của Mê Linh">
          {SOCIAL_ITEMS.map(([label, href]) => (
            <a href={href} key={label} target="_blank" rel="noopener noreferrer">
              <KineticRollText>{label}</KineticRollText>
            </a>
          ))}
        </nav>
      </div>

      {/* Main Closing Editorial Card */}
      <div className="closing-shell-container">
        <div className="closing-shell">
          <span className="closing-shell-cap" aria-hidden="true" />
          <div className="closing-topbar">
            <a className="closing-wordmark" href="#home" aria-label={`${settings.siteName} - về trang đầu`}>
              <span>{nameLines[0]}</span>
              <span>{nameLines.slice(1).join(" ")}</span>
            </a>
            <a className="closing-visit-link" href="#lien-he">
              <MapPin aria-hidden="true" />
              <KineticRollText>GHÉ MÊ LINH</KineticRollText>
            </a>
          </div>

          <div className="closing-stage">
            <p className="closing-kicker">{fullBleedArrival.eyebrow || `MỘT NƠI ĐỂ TRỞ VỀ / ${settings.tagline}`}</p>
            <h2 id="closing-title">
              <span>{closingHeadline[0]}</span>
              <em>{closingHeadline[1]}</em>
            </h2>

            <figure className="closing-portrait">
              <AdaptiveImage
                src={closingImageSrc}
                alt={closingImageAlt}
                colorVariant="closing-portrait"
                imagePosition={closingImagePosition}
                imageVariant="large"
                loading="lazy"
                sizes="(max-width: 680px) 72vw, 34vw"
              />
              <figcaption>{settings.siteName} <span>•</span> {settings.tagline}</figcaption>
            </figure>

            {/* Left Nav Column (TRANG) */}
            <nav className="closing-nav" aria-label="Điều hướng chân trang">
              <span className="closing-nav-label">TRANG</span>
              {NAV_ITEMS.map(([label, href]) => (
                <a href={href} key={label}>
                  <KineticRollText>{label}</KineticRollText>
                </a>
              ))}
            </nav>

            {/* Right Nav Column (THEO DÕI) */}
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
            <span>BẢN QUYỀN © 2026 {settings.siteName.toUpperCase()}</span>
            <span>THIẾT KẾ ĐỘC BẢN • HÀ NỘI</span>
          </div>
        </div>
      </div>
    </section>
  );
}
