import { memo, useCallback, useEffect, useRef } from "react";
import { ArrowDownRight } from "lucide-react";
import AdaptiveImage from "../AdaptiveImage.jsx";
import RevealLine from "../RevealLine.jsx";
import RevealLines from "../RevealLines.jsx";
import { useSiteContent } from "../../content/SiteContentProvider.jsx";
import { useSectionProgress } from "../../hooks/useMotion.js";
import { prewarmCmsImage } from "../../media.js";
import { smoothStep } from "../../utils/math.js";

export default memo(function VisitChoicesSection({ reducedMotion }) {
  const { content } = useSiteContent();
  const { fullBleedArrival, visitChoices } = content;
  const gate = visitChoices.gate || {
    imageAlt: "Cổng trại Chi đội Thôn 3 Hạ Lôi với bố cục ba khung.",
    imageSrc: "/assets/camp-gate-thon3.png",
  };
  const sectionRef = useRef(null);
  const baseRef = useRef(null);
  const gateMediaMotionRef = useRef(null);
  const choiceMotionRefs = useRef([]);
  const pushUpMediaRef = useRef(null);
  const pushUpImageRef = useRef(null);
  const entryProgressRef = useRef(reducedMotion ? 1 : 0);
  const stageProgressRef = useRef(0);

  const prewarmVisitMedia = useCallback(() => {
    prewarmCmsImage(gate.imageSrc, "full", "(max-width: 680px) min(100vw, 600px), min(88vw, 1240px, 127svh)");
    prewarmCmsImage(fullBleedArrival.imageSrc, "full", "100vw");
  }, [fullBleedArrival.imageSrc, gate.imageSrc]);

  useEffect(() => {
    prewarmVisitMedia();
  }, [prewarmVisitMedia]);

  const applyProgress = useCallback((viewport) => {
    const stageProgress = stageProgressRef.current;
    const coverProgress = smoothStep(Math.min(Math.max((stageProgress - 0.76) / 0.24, 0), 1));
    const gateEntryProgress = smoothStep(Math.min(entryProgressRef.current * 1.2, 1));
    const baseRevealProgress = Math.min(entryProgressRef.current, 1 - coverProgress);
    const choiceOpenProgress = reducedMotion
      ? 1
      : smoothStep(Math.min(Math.max((stageProgress - (viewport.isCompact ? 0.08 : 0.18)) / 0.22, 0), 1));
    const sideReveal = smoothStep(baseRevealProgress) * choiceOpenProgress;
    const sideTravel = viewport.isCompact ? 30 : 24;
    const sideOpacity = viewport.isCompact ? 0.06 + sideReveal * 0.94 : sideReveal;
    const arrivalImageScale = 1.04 + coverProgress * 0.06;
    const gateOpacity = 0.03 + gateEntryProgress * 0.97;

    baseRef.current?.style.setProperty("--reveal-progress", `${sideReveal}`);

    if (gateMediaMotionRef.current) {
      gateMediaMotionRef.current.style.opacity = `${gateOpacity}`;
      gateMediaMotionRef.current.style.transform = `translate3d(0, ${(1 - sideReveal) * 4}vh, 0)`;
    }

    const leftChoice = choiceMotionRefs.current[0];
    const rightChoice = choiceMotionRefs.current[1];
    if (leftChoice) {
      leftChoice.style.opacity = `${sideOpacity}`;
      leftChoice.style.transform = `translate3d(-${(1 - sideReveal) * sideTravel}vw, 0, 0)`;
    }
    if (rightChoice) {
      rightChoice.style.opacity = `${sideOpacity}`;
      rightChoice.style.transform = `translate3d(${(1 - sideReveal) * sideTravel}vw, 0, 0)`;
    }

    if (pushUpMediaRef.current) {
      if (viewport.isCompact) {
        const startOffset = Math.ceil(viewport.height) + 2;
        pushUpMediaRef.current.style.transform = `translate3d(0, ${(1 - coverProgress) * startOffset}px, 0)`;
      } else {
        pushUpMediaRef.current.style.transform = `translate3d(0, ${(1 - coverProgress) * 100}%, 0)`;
      }
    }

    if (pushUpImageRef.current) pushUpImageRef.current.style.transform = `scale(${arrivalImageScale})`;
  }, [reducedMotion]);

  useSectionProgress(sectionRef, reducedMotion, (progress, _velocity, viewport, motion) => {
    entryProgressRef.current = motion.entryProgress;
    stageProgressRef.current = progress;
    applyProgress(viewport);
  }, undefined, {
    name: "visit-choices",
    prewarm: prewarmVisitMedia,
    updateWhilePrewarmed: true,
    willChange: "opacity, transform",
    willChangeTargets: () => [
      gateMediaMotionRef.current,
      ...choiceMotionRefs.current,
      pushUpMediaRef.current,
      pushUpImageRef.current,
    ],
  });

  return (
    <section
      className={`visit-choices-section${reducedMotion ? " visit-choices-reduced-motion" : ""}`}
      id="lien-he"
      ref={sectionRef}
      aria-labelledby="visit-title"
    >
      <div className="visit-choices-stage">
        <div className="visit-choices-base" ref={baseRef}>
          <figure className="visit-gate-media" role="img" aria-label={gate.imageAlt} data-preview-target="visit-gate">
            <div className="visit-gate-media-motion" ref={gateMediaMotionRef}>
              <div className="visit-gate-portal" aria-hidden="true">
                <div className="visit-gate-whole">
                  <AdaptiveImage
                    src={gate.imageSrc}
                    alt=""
                    imageVariant="full"
                    sizes="(max-width: 680px) min(100vw, 600px), min(88vw, 1240px, 127svh)"
                  />
                </div>
              </div>
            </div>
          </figure>

          <div className="visit-choices-layout">
            {[visitChoices.left, visitChoices.right].map((choice, index) => (
              <article
                className="visit-choice"
                key={choice.upper}
                data-preview-target={`visit-${index}`}
                ref={(node) => { choiceMotionRefs.current[index] = node; }}
              >
                <p className="visit-choice-kicker"><RevealLine>{choice.kicker}</RevealLine></p>
                <h2 id={choice === visitChoices.left ? "visit-title" : undefined}>
                  <RevealLine direction={index % 2 === 0 ? "right" : "left"}><span>{choice.upper}</span></RevealLine>
                  <RevealLine direction={index % 2 === 0 ? "left" : "right"}><strong>{choice.lower}</strong></RevealLine>
                </h2>
                <p className="visit-choice-copy"><RevealLines direction="left">{choice.copy}</RevealLines></p>
                <a className="visit-choice-command" href={choice.href} aria-label={choice.actionLabel} title={choice.actionLabel}>
                  <ArrowDownRight aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>

          <p className="visit-choice-caption"><RevealLine direction="right">{visitChoices.caption}</RevealLine></p>
        </div>

        <figure className="visit-push-up-media" ref={pushUpMediaRef} data-preview-target="visit-arrival">
          <AdaptiveImage
            src={fullBleedArrival.imageSrc}
            alt={fullBleedArrival.imageAlt}
            ref={pushUpImageRef}
            imagePosition={fullBleedArrival.imagePosition}
            sizes="100vw"
          />
        </figure>
      </div>
    </section>
  );
});
