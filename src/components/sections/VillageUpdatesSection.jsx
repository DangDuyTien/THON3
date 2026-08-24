import { memo, useCallback, useEffect, useRef } from "react";
import AdaptiveImage from "../AdaptiveImage.jsx";
import RevealLine from "../RevealLine.jsx";
import { useSiteContent } from "../../content/SiteContentProvider.jsx";
import { useSectionProgress } from "../../hooks/useMotion.js";
import { smoothStep } from "../../utils/math.js";

export default memo(function VillageUpdatesSection({ reducedMotion }) {
  const { content } = useSiteContent();
  const { settings, villageUpdates } = content;
  const sectionRef = useRef(null);
  const cardRefs = useRef([]);
  const middleIndex = (villageUpdates.cards.length - 1) / 2;
  const layoutRef = useRef({ cardWidth: 200, cardSpacing: 120, compact: false });

  const computeCardLayout = useCallback((viewportWidth) => {
    const compact = viewportWidth <= 680;
    const cardWidth = compact
      ? Math.max(116, Math.min(viewportWidth * 0.29, 158))
      : Math.max(166, Math.min(viewportWidth * 0.155, 274));
    const cardSpacing = compact
      ? Math.min(viewportWidth * 0.165, 88)
      : Math.min(cardWidth * 0.96, viewportWidth * 0.158);

    layoutRef.current = { cardWidth, cardSpacing, compact };

    villageUpdates.cards.forEach((_, index) => {
      const card = cardRefs.current[index];
      if (card) card.style.width = `${cardWidth}px`;
    });
  }, [villageUpdates.cards]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const resizeObserver = new ResizeObserver(([entry]) => {
      computeCardLayout(entry.contentRect.width || window.innerWidth);
    });
    resizeObserver.observe(section);
    computeCardLayout(section.getBoundingClientRect().width || window.innerWidth);
    return () => resizeObserver.disconnect();
  }, [computeCardLayout]);

  useSectionProgress(sectionRef, reducedMotion, (progress) => {
    // Enter as a solid deck first; only the later part of the sticky scene fans the cards out.
    const stackEntry = reducedMotion ? 1 : smoothStep(Math.min(progress / 0.16, 1));
    const fanProgress = reducedMotion
      ? 1
      : smoothStep(Math.min(Math.max((progress - 0.18) / 0.62, 0), 1));
    const { cardSpacing, compact } = layoutRef.current;
    const stackLift = (1 - stackEntry) * (compact ? 88 : 132);
    const stackRotationScale = 1 - fanProgress;

   villageUpdates.cards.forEach((_, index) => {
     const offset = index - middleIndex;
      const stackX = offset * (compact ? 1.5 : 2.5);
      const fanX = offset * cardSpacing;
      const x = stackX * stackRotationScale + fanX * fanProgress;
      const stackY = offset * (compact ? 4 : 5);
      const fanY = (offset * 7) * (1 - fanProgress) + (Math.abs(offset) % 2 === 0 ? 6 : -8) * fanProgress;
      const y = stackLift + stackY * stackRotationScale + fanY * fanProgress;
      const stackRotation = offset * (compact ? 0.7 : 0.45);
      const fanRotation = offset * (compact ? 5.4 : 4.1);
      const rotation = stackRotation * stackRotationScale + fanRotation * fanProgress;
      const scale = 0.88 + fanProgress * 0.12;
     const card = cardRefs.current[index];
     if (!card) return;

      card.style.opacity = "1";
     card.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) rotate(${rotation}deg) scale(${scale})`;
   });
  }, 1, {
    name: "village-updates",
    willChange: "opacity, transform",
    willChangeTargets: () => cardRefs.current.slice(0, window.innerWidth <= 680 ? 4 : 6),
  });

  return (
    <section
      className={`village-updates-section${reducedMotion ? " village-updates-reduced-motion" : ""}`}
      id="nhip-song-hom-nay"
      ref={sectionRef}
      aria-labelledby="updates-title"
    >
      <div className="village-updates-stage">
        <div className="village-updates-heading">
          <p className="village-updates-eyebrow"><span /> <RevealLine>{villageUpdates.eyebrow}</RevealLine></p>
          <h2 id="updates-title">
            <RevealLine direction="right"><span>{villageUpdates.headline[0]}</span></RevealLine>
            <RevealLine direction="left"><strong>{villageUpdates.headline[1]}</strong></RevealLine>
          </h2>
        </div>

        <div className="village-updates-cards" aria-label={`Sáu hoạt động đang diễn ra tại ${settings.siteName}`}>
          {villageUpdates.cards.map((card, index) => {
            const offset = index - middleIndex;

            return (
              <article
                className={`village-update-card village-update-card-${card.tone}`}
                key={card.id}
                data-preview-target={`updates-${card.id}`}
                ref={(node) => { cardRefs.current[index] = node; }}
                style={{ zIndex: Math.round(20 - Math.abs(offset) * 2) }}
              >
                <div className="village-update-card-surface">
                  <AdaptiveImage
                    src={card.imageSrc || villageUpdates.imageSrc}
                    alt={card.imageAlt}
                    colorVariant={`update-${card.tone}`}
                    imagePosition={card.imagePosition}
                    imageVariant="large"
                    sizes="(max-width: 680px) 86vw, 32vw"
                  />
                  <div className="village-update-card-copy">
                    <RevealLine direction={index % 2 === 0 ? "right" : "left"}>{card.label}</RevealLine>
                    <strong><RevealLine direction={index % 2 === 0 ? "left" : "right"}>{card.meta}</RevealLine></strong>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <p className="village-updates-count" aria-hidden="true"><RevealLine direction="left">{String(villageUpdates.cards.length).padStart(2, "0")} / {String(villageUpdates.cards.length).padStart(2, "0")}</RevealLine></p>
      </div>
    </section>
  );
});
