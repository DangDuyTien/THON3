import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import AdaptiveImage from "./AdaptiveImage.jsx";
import { useSiteContent } from "../content/SiteContentProvider.jsx";
import { subscribeContinuousFrame } from "../motion-frame-scheduler.js";

const DEFAULT_SOCIAL_ITEMS = [
  { label: "Facebook", href: "/dong-hanh" },
  { label: "Instagram", href: "/dong-hanh" },
  { label: "YouTube", href: "/dong-hanh" },
  { label: "TikTok", href: "/dong-hanh" },
];

const DEFAULT_NAV_ITEMS = [
  { label: "Trang chủ", href: "/" },
  { label: "Câu chuyện", href: "/cau-chuyen" },
  { label: "Nhịp sống", href: "/nhung-mua" },
  { label: "Tư liệu", href: "/tu-lieu" },
  { label: "Cộng đồng", href: "/dong-hanh" },
];

const DEFAULT_NETWORK_ITEMS = [
  { label: "Mê Linh", href: "/" },
  { label: "Hà Nội", href: "/lien-he" },
  { label: "Kết nối", href: "/dong-hanh" },
];

function isExternalLink(href) {
  return /^(?:https?:|mailto:|tel:)/i.test(String(href || ""));
}

function LinkProps({ href }) {
  return isExternalLink(href) ? { target: "_blank", rel: "noopener noreferrer" } : {};
}

function KineticRollText({ children }) {
  const text = String(children);
  return (
    <span className="closing-kinetic-roll">
      <span className="closing-kinetic-white">{text}</span>
      <span className="closing-kinetic-green" aria-hidden="true">{text}</span>
    </span>
  );
}

export default function ClosingSection({ reducedMotion }) {
  const { content } = useSiteContent();
  const { settings, fullBleedArrival, communityPartners } = content;
  const closing = content.closing || {};
  const nameLines = settings.siteName.split(" ");
  const organizations = communityPartners.organizations;
  const socialItems = Array.isArray(closing.socialItems) && closing.socialItems.length ? closing.socialItems : DEFAULT_SOCIAL_ITEMS;
  const navItems = Array.isArray(closing.navItems) && closing.navItems.length ? closing.navItems : DEFAULT_NAV_ITEMS;
  const networkItems = Array.isArray(closing.networkItems) && closing.networkItems.length ? closing.networkItems : DEFAULT_NETWORK_ITEMS;
  const closingHeadline = Array.isArray(fullBleedArrival.headline) && fullBleedArrival.headline.length >= 2
    ? fullBleedArrival.headline
    : ["LUÔN CÓ", "MỘT LỐI VỀ."];
  const closingImageSrc = fullBleedArrival.portraitSrc || fullBleedArrival.imageSrc;
  const closingImageAlt = fullBleedArrival.portraitAlt || fullBleedArrival.imageAlt;
  const closingImagePosition = fullBleedArrival.imagePosition || "center 58%";
  const sectionRef = useRef(null);
  const marqueeRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const marquee = marqueeRef.current;
    if (!section || !marquee || reducedMotion) return undefined;

    const firstGroup = marquee.firstElementChild;
    const groupWidthRef = { current: 0 };
    const measure = () => {
      if (!firstGroup) return;
      const width = Math.max(firstGroup.scrollWidth, firstGroup.getBoundingClientRect().width);
      if (width > 0) groupWidthRef.current = width;
    };
    measure();

    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(measure);
    resizeObserver?.observe(firstGroup || marquee);
    if (!resizeObserver) window.addEventListener("resize", measure, { passive: true });

    let position = 0;
    let lastTime = performance.now();
    const onFrame = (timestamp) => {
      const delta = Math.min(timestamp - lastTime, 32);
      lastTime = timestamp;
      const groupWidth = groupWidthRef.current;
      if (!groupWidth || !marqueeRef.current) return;

      position -= delta * 0.045;
      if (position <= -groupWidth) {
        position += groupWidth;
      }
      marqueeRef.current.style.transform = `translate3d(${position}px, 0, 0)`;
    };

    let unsubscribeFrame = null;
    const startFrameLoop = () => {
      if (unsubscribeFrame) return;
      lastTime = performance.now();
      unsubscribeFrame = subscribeContinuousFrame(onFrame);
    };
    const stopFrameLoop = () => {
      unsubscribeFrame?.();
      unsubscribeFrame = null;
    };
    const intersectionObserver = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) startFrameLoop();
        else stopFrameLoop();
      }, { rootMargin: "20% 0px 20% 0px" });

    if (intersectionObserver) intersectionObserver.observe(section);
    else startFrameLoop();

    return () => {
      stopFrameLoop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener("resize", measure);
    };
  }, [reducedMotion]);

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
    <section className="closing-section" id="ket-lai" ref={sectionRef} aria-labelledby="closing-title">
      {/* Top Section Transition Kicker */}
      <div className="closing-transition">
        <p className="closing-transition-kicker">{closing.transitionKicker || "CỘNG ĐỒNG / MÊ LINH"}</p>
        <h2>{closing.transitionTitle || "Theo dõi Mê Linh"}</h2>
        <nav className="closing-social-links" aria-label="Mạng xã hội của Mê Linh">
          {socialItems.map((item, index) => {
            const label = item?.label || `Kênh ${index + 1}`;
            const href = item?.href || "/dong-hanh";
            return (
              <a href={href} key={`${label}-${index}`} {...LinkProps({ href })}>
                <KineticRollText>{label}</KineticRollText>
              </a>
            );
          })}
        </nav>
      </div>

      {/* Main Closing Editorial Card */}
      <div className="closing-shell-container">
        <div className="closing-shell">
          <svg className="closing-shell-cap" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path d="M0 100 H245 C295 100 335 88 370 48 C392 20 407 0 438 0 H562 C593 0 608 20 630 48 C665 88 705 100 755 100 H1000 V100 H0 Z" />
          </svg>
          <div className="closing-topbar">
            <a className="closing-wordmark" href="/" aria-label={`${settings.siteName} - về trang đầu`}>
              <span>{nameLines[0]}</span>
              <span>{nameLines.slice(1).join(" ")}</span>
            </a>
            <a className="closing-visit-link" href="/lien-he">
              <MapPin aria-hidden="true" />
              <KineticRollText>{closing.visitLabel || "GHÉ MÊ LINH"}</KineticRollText>
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
              <span className="closing-nav-label">{closing.navLabel || "TRANG"}</span>
              {navItems.map((item, index) => {
                const label = item?.label || `Trang ${index + 1}`;
                const href = item?.href || "/";
                return <a href={href} key={`${label}-${index}`} {...LinkProps({ href })}><KineticRollText>{label}</KineticRollText></a>;
              })}
            </nav>

            {/* Right Nav Column (THEO DÕI) */}
            <nav className="closing-network" aria-label="Kết nối Mê Linh">
              <span className="closing-nav-label">{closing.networkLabel || "THEO DÕI"}</span>
              {networkItems.map((item, index) => {
                const label = item?.label || `Kênh ${index + 1}`;
                const href = item?.href || "/dong-hanh";
                return <a href={href} key={`${label}-${index}`} {...LinkProps({ href })}><KineticRollText>{label}</KineticRollText></a>;
              })}
            </nav>

            <a className="closing-contact" href={closing.contactHref || "/dong-hanh"} {...LinkProps({ href: closing.contactHref || "/dong-hanh" })}>
              <KineticRollText>{closing.contactLabel || "KẾT NỐI CÙNG MÊ LINH"}</KineticRollText>
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
            <span>{String(closing.copyrightTemplate || "BẢN QUYỀN © 2026 {siteName}").replace("{siteName}", settings.siteName.toUpperCase())}</span>
            <span>{closing.designCredit || "THIẾT KẾ ĐỘC BẢN • HÀ NỘI"}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
