import { memo, useEffect, useRef } from "react";
import { useSiteContent } from "../../content/SiteContentProvider.jsx";
import RevealLine from "../RevealLine.jsx";
import RevealLines from "../RevealLines.jsx";
import { subscribeContinuousFrame } from "../../motion-frame-scheduler.js";

const CommunityReveal = RevealLine;

export default memo(function CommunityPartnersSection({ reducedMotion }) {
  const { content } = useSiteContent();
  const { communityPartners } = content;
  const sectionRef = useRef(null);
  const marqueeRef = useRef(null);
  const trackRef = useRef(null);
  const groupWidthRef = useRef(0);
  const positionRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const visibleRef = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track || reducedMotion) return undefined;

    const firstGroup = track.firstElementChild;
    const measure = () => {
      if (!firstGroup) return;
      const width = Math.max(firstGroup.getBoundingClientRect().width, firstGroup.scrollWidth);
      if (width > 40) groupWidthRef.current = width;
    };
    measure();

    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(measure);
    resizeObserver?.observe(firstGroup || track);
    if (!resizeObserver) window.addEventListener("resize", measure, { passive: true });

    const intersectionObserver = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(([entry]) => {
        visibleRef.current = entry.isIntersecting;
      }, { rootMargin: "80% 0px 80% 0px" });
    if (intersectionObserver) intersectionObserver.observe(section);
    else visibleRef.current = true;

    let lastTime = performance.now();
    const onFrame = (timestamp) => {
      if (!visibleRef.current || !marqueeRef.current || !groupWidthRef.current) return;
      const delta = Math.min(timestamp - lastTime, 32);
      lastTime = timestamp;
      scrollOffsetRef.current *= 0.92;
      if (Math.abs(scrollOffsetRef.current) < 0.01) scrollOffsetRef.current = 0;
      const speed = (1.5 + scrollOffsetRef.current * 0.05) * (delta / 16.66);
      positionRef.current += speed;
      if (positionRef.current >= groupWidthRef.current) positionRef.current -= groupWidthRef.current;
      marqueeRef.current.style.transform = `translate3d(-${positionRef.current.toFixed(2)}px, 0, 0)`;
    };
    const unsubscribe = subscribeContinuousFrame(onFrame);

    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;
      lastScrollY = currentScrollY;
      if (!visibleRef.current || Math.abs(delta) <= 0.5) return;
      scrollOffsetRef.current = Math.min(Math.max(scrollOffsetRef.current + delta * 0.18, -60), 60);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      unsubscribe();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", handleScroll);
    };
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
          <img alt={organization.logoAlt} decoding="async" height="178" loading="lazy" src={organization.logo} width="160" />
        ) : (
          <span className="community-partner-mark" aria-hidden="true">{organization.mark}</span>
        )}
        <span className="community-partner-label">
          <span className="community-partner-name">{organization.label}</span>
        </span>
      </div>
    ));

  return (
    <section className="community-partners-section" id="dong-hanh" ref={sectionRef} aria-labelledby="community-title">
      <p className="community-script" aria-hidden="true">ĐỒNG HÀNH</p>
      <div className="community-partners-layout">
        <div className="community-partners-copy">
          <p className="community-eyebrow"><span /> <CommunityReveal>{communityPartners.eyebrow}</CommunityReveal></p>
          <h2 id="community-title">
            {communityPartners.headline.map((line, index) => (
              <CommunityReveal key={line} direction={index % 2 === 0 ? "right" : "left"}>{line}</CommunityReveal>
            ))}
          </h2>
        </div>
        <p className="community-partners-intro"><RevealLines direction="left">{communityPartners.copy}</RevealLines></p>
      </div>
      <div className="community-partners-list" role="list" aria-label="Các đơn vị đồng hành">
        <div className="community-partners-marquee" ref={marqueeRef}>
          <div className="community-partners-track" ref={trackRef}>
            <div className="community-partners-group" role="presentation">{renderOrganizationGroup(false)}</div>
            <div className="community-partners-group" role="presentation" aria-hidden="true">{renderOrganizationGroup(true)}</div>
            <div className="community-partners-group" role="presentation" aria-hidden="true">{renderOrganizationGroup(true)}</div>
            <div className="community-partners-group" role="presentation" aria-hidden="true">{renderOrganizationGroup(true)}</div>
          </div>
        </div>
      </div>
    </section>
  );
});
