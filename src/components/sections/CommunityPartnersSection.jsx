import { memo, useEffect, useRef } from "react";
import { useSiteContent } from "../../content/SiteContentProvider.jsx";
import RevealLine from "../RevealLine.jsx";
import RevealLines from "../RevealLines.jsx";

const CommunityReveal = RevealLine;

export default memo(function CommunityPartnersSection({ reducedMotion }) {
  const { content } = useSiteContent();
  const { communityPartners } = content;
  const sectionRef = useRef(null);
  const marqueeRef = useRef(null);
  const trackRef = useRef(null);

  // Motion State Refs
  const positionRef = useRef(0);
  const scrollOffsetRef = useRef(0);

  // 1. Instant 60fps Continuous Loop (Pure gliding marquee motion)
  useEffect(() => {
    if (reducedMotion) return undefined;

    let animationFrameId;
    let lastTime = performance.now();

    const getGroupWidth = () => {
      if (!trackRef.current) return 0;
      const firstGroup = trackRef.current.firstElementChild;
      if (firstGroup) {
        const rectWidth = firstGroup.getBoundingClientRect().width;
        const scrollWidth = firstGroup.scrollWidth;
        const width = Math.max(rectWidth, scrollWidth);
        if (width > 40) return width;
      }
      return 0;
    };

    const loop = (timestamp) => {
      const delta = Math.min(timestamp - lastTime, 32);
      lastTime = timestamp;

      const groupWidth = getGroupWidth();
      if (groupWidth > 0 && marqueeRef.current) {
        // Smoothly decay scroll momentum
        scrollOffsetRef.current *= 0.92;
        if (Math.abs(scrollOffsetRef.current) < 0.01) scrollOffsetRef.current = 0;

        // Speed: 1.5px/frame base + scroll impulse
        const speed = (1.5 + scrollOffsetRef.current * 0.12) * (delta / 16.66);
        positionRef.current += speed;

        // Wrap around seamlessly
        if (positionRef.current >= groupWidth) {
          positionRef.current -= groupWidth;
        } else if (positionRef.current < 0) {
          positionRef.current += groupWidth;
        }

        marqueeRef.current.style.transform = `translate3d(-${positionRef.current.toFixed(2)}px, 0, 0)`;
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [reducedMotion]);

  // 2. Scroll Momentum Listener
  useEffect(() => {
    if (reducedMotion) return undefined;

    let lastScrollY = typeof window !== "undefined" ? window.scrollY : 0;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;
      lastScrollY = currentScrollY;

      if (Math.abs(delta) > 0.5) {
        scrollOffsetRef.current += delta * 0.45;
        scrollOffsetRef.current = Math.min(Math.max(scrollOffsetRef.current, -100), 100);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [reducedMotion]);

  const organizations = communityPartners.organizations;

  const renderOrganizationGroup = (ariaHidden = false) =>
    organizations.map((organization, index) => (
      <div
        className={`community-partner community-partner-${organization.type ?? "wordmark"}`}
        key={`${organization.id}-${ariaHidden ? "clone" : "orig"}-${index}`}
        role="listitem"
        data-preview-target={`community-${organization.id}`}
        aria-hidden={ariaHidden}
      >
        {organization.logo ? (
          <img src={organization.logo} alt={organization.logoAlt} decoding="async" height="178" loading="eager" width="160" />
        ) : (
          <span className="community-partner-mark" aria-hidden="true">{organization.mark}</span>
        )}
        <span className="community-partner-label">
          <span className="community-partner-name">{organization.label}</span>
        </span>
      </div>
    ));

  return (
    <section
      className="community-partners-section"
      id="dong-hanh"
      ref={sectionRef}
      aria-labelledby="community-title"
    >
      <p className="community-script" aria-hidden="true">ĐỒNG HÀNH</p>
      <div className="community-partners-layout">
        <div className="community-partners-copy">
          <p className="community-eyebrow">
            <span /> <CommunityReveal>{communityPartners.eyebrow}</CommunityReveal>
          </p>
          <h2 id="community-title">
            {communityPartners.headline.map((line, index) => (
              <CommunityReveal key={line} direction={index % 2 === 0 ? "right" : "left"}>{line}</CommunityReveal>
            ))}
          </h2>
        </div>

        <p className="community-partners-intro">
          <RevealLines direction="left">{communityPartners.copy}</RevealLines>
        </p>
      </div>

      <div
        className="community-partners-list"
        role="list"
        aria-label="Các đơn vị đồng hành"
      >
        <div className="community-partners-marquee" ref={marqueeRef}>
          <div className="community-partners-track" ref={trackRef}>
            <div className="community-partners-group" role="presentation">
              {renderOrganizationGroup(false)}
            </div>
            <div className="community-partners-group" role="presentation" aria-hidden="true">
              {renderOrganizationGroup(true)}
            </div>
            <div className="community-partners-group" role="presentation" aria-hidden="true">
              {renderOrganizationGroup(true)}
            </div>
            <div className="community-partners-group" role="presentation" aria-hidden="true">
              {renderOrganizationGroup(true)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
