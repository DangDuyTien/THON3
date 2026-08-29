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

    let lastTime = performance.now();
    const onFrame = (timestamp) => {
      if (!visibleRef.current || !marqueeRef.current || !groupWidthRef.current) return;
      const delta = Math.min(timestamp - lastTime, 32);
      lastTime = timestamp;
      scrollOffsetRef.current *= 0.92;
      if (Math.abs(scrollOffsetRef.current) < 0.01) scrollOffsetRef.current = 0;
      if (scrollOffsetRef.current === 0) {
        if (lastTransform !== 0) {
          marqueeRef.current.style.transform = "translate3d(0, 0, 0)";
          lastTransform = 0;
        }
        return;
      }
      const speed = scrollOffsetRef.current * (delta / 16.66);
      positionRef.current += speed;
      if (positionRef.current >= groupWidthRef.current) positionRef.current -= groupWidthRef.current;
      if (positionRef.current < 0) positionRef.current += groupWidthRef.current;
      const nextTransform = -positionRef.current;
      if (nextTransform !== lastTransform) {
        marqueeRef.current.style.transform = `translate3d(${nextTransform.toFixed(2)}px, 0, 0)`;
        lastTransform = nextTransform;
      }
    };
    let lastTransform = 0;
    let frameHandle = null;
    const ensureFrameLoop = () => {
      if (frameHandle !== null) return;
      marqueeRef.current?.style.setProperty("will-change", "transform");
      lastTime = performance.now();
      const tick = (timestamp) => {
        frameHandle = null;
        onFrame(timestamp);
        if (scrollOffsetRef.current !== 0) {
          frameHandle = window.requestAnimationFrame(tick);
        } else {
          marqueeRef.current?.style.removeProperty("will-change");
        }
      };
      frameHandle = window.requestAnimationFrame(tick);
    };
    const stopFrameLoop = () => {
      if (frameHandle !== null) {
        window.cancelAnimationFrame(frameHandle);
        frameHandle = null;
      }
      scrollOffsetRef.current = 0;
      lastTransform = -positionRef.current;
      if (lastTransform !== 0) {
        marqueeRef.current.style.transform = "translate3d(0, 0, 0)";
        positionRef.current = 0;
        lastTransform = 0;
      }
      marqueeRef.current?.style.removeProperty("will-change");
    };

    const intersectionObserver = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(([entry]) => {
        visibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting && scrollOffsetRef.current !== 0) ensureFrameLoop();
        else if (!entry.isIntersecting) stopFrameLoop();
      }, { rootMargin: "20% 0px 20% 0px" });
    if (intersectionObserver) intersectionObserver.observe(section);

    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;
      lastScrollY = currentScrollY;
      if (!visibleRef.current || Math.abs(delta) <= 0.5) return;
      scrollOffsetRef.current = Math.min(Math.max(scrollOffsetRef.current + delta * 0.18, -60), 60);
      if (scrollOffsetRef.current !== 0) ensureFrameLoop();
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      stopFrameLoop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [reducedMotion]);

  const organizations = communityPartners.organizations;
  const marqueeGroupCount = typeof window !== "undefined"
    && window.matchMedia("(max-width: 680px)").matches ? 2 : 3;

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
            {Array.from({ length: marqueeGroupCount }, (_, index) => (
              <div
                className="community-partners-group"
                role="presentation"
                aria-hidden={index > 0 || undefined}
                key={`community-group-${index}`}
              >
                {renderOrganizationGroup(index > 0)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});
