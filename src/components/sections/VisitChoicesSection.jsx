import { memo, useCallback, useRef } from "react";
import { ArrowDownRight } from "lucide-react";
import AdaptiveImage from "../AdaptiveImage.jsx";
import RevealLine from "../RevealLine.jsx";
import { useSiteContent } from "../../content/SiteContentProvider.jsx";
import { useSectionProgress } from "../../hooks/useMotion.js";
import { prewarmCmsImage } from "../../media.js";
import { smoothStep } from "../../utils/math.js";

export default memo(function VisitChoicesSection({ reducedMotion }) {
  const { content } = useSiteContent();
  const { fullBleedArrival, visitChoices } = content;
  const sectionRef = useRef(null);
  const baseRef = useRef(null);
  const leftMediaMotionRef = useRef(null);
  const rightMediaMotionRef = useRef(null);
  const choiceMotionRefs = useRef([]);
  const pushUpMediaRef = useRef(null);
  const pushUpImageRef = useRef(null);
  const entryProgressRef = useRef(reducedMotion ? 1 : 0);
  const stageProgressRef = useRef(0);

  const prewarmVisitMedia = useCallback(() => {
    prewarmCmsImage(visitChoices.left.imageSrc, "small", "(max-width: 680px) 56vw, 20vw");
    prewarmCmsImage(visitChoices.right.imageSrc, "small", "(max-width: 680px) 56vw, 20vw");
    prewarmCmsImage(fullBleedArrival.imageSrc, "full", "100vw");
  }, [fullBleedArrival.imageSrc, visitChoices.left.imageSrc, visitChoices.right.imageSrc]);

  const applyProgress = (viewport) => {
    const stageProgress = stageProgressRef.current;
    const coverProgress = smoothStep(stageProgress / 0.78);
    const baseRevealProgress = Math.min(entryProgressRef.current, 1 - coverProgress);
    const sideReveal = smoothStep(baseRevealProgress);
    const sideTravel = viewport.isCompact ? 46 : 24;
    const sideOpacity = 0.06 + sideReveal * 0.94;
    const arrivalImageScale = 1.04 + coverProgress * 0.06;

    baseRef.current?.style.setProperty("--reveal-progress", `${sideReveal}`);

    if (leftMediaMotionRef.current) {
      leftMediaMotionRef.current.style.opacity = `${sideOpacity}`;
      leftMediaMotionRef.current.style.transform = `translate3d(-${(1 - sideReveal) * sideTravel}vw, 0, 0)`;
    }

    if (rightMediaMotionRef.current) {
      rightMediaMotionRef.current.style.opacity = `${sideOpacity}`;
      rightMediaMotionRef.current.style.transform = `translate3d(${(1 - sideReveal) * sideTravel}vw, 0, 0)`;
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
      pushUpMediaRef.current.style.transform = `translate3d(0, ${(1 - coverProgress) * 100}%, 0)`;
    }

    if (pushUpImageRef.current) pushUpImageRef.current.style.transform = `scale(${arrivalImageScale})`;
  };

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
      leftMediaMotionRef.current,
      rightMediaMotionRef.current,
      ...choiceMotionRefs.current,
      pushUpMediaRef.current,
      ...(typeof window !== "undefined" && window.innerWidth > 680 ? [pushUpImageRef.current] : []),
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
          <figure className="visit-side-media visit-side-media-left">
            <div className="visit-side-media-motion" ref={leftMediaMotionRef}>
              <AdaptiveImage
                src={visitChoices.left.imageSrc}
                alt={visitChoices.left.imageAlt}
                imagePosition={visitChoices.left.imagePosition}
                imageVariant="small"
                sizes="(max-width: 680px) 56vw, 20vw"
              />
            </div>
          </figure>
          <figure className="visit-side-media visit-side-media-right">
            <div className="visit-side-media-motion" ref={rightMediaMotionRef}>
              <AdaptiveImage
                src={visitChoices.right.imageSrc}
                alt={visitChoices.right.imageAlt}
                imagePosition={visitChoices.right.imagePosition}
                imageVariant="small"
                sizes="(max-width: 680px) 56vw, 20vw"
              />
            </div>
          </figure>

          <div className="visit-choices-layout">
            {[visitChoices.left, visitChoices.right].map((choice, index) => (
              <article
                className="visit-choice"
                key={choice.upper}
                ref={(node) => { choiceMotionRefs.current[index] = node; }}
              >
                <p className="visit-choice-kicker"><RevealLine>{choice.kicker}</RevealLine></p>
                <h2 id={choice === visitChoices.left ? "visit-title" : undefined}>
                  <RevealLine direction={index % 2 === 0 ? "right" : "left"}><span>{choice.upper}</span></RevealLine>
                  <RevealLine direction={index % 2 === 0 ? "left" : "right"}><strong>{choice.lower}</strong></RevealLine>
                </h2>
                <p className="visit-choice-copy"><RevealLine direction="left">{choice.copy}</RevealLine></p>
                <a className="visit-choice-command" href={choice.href} aria-label={choice.actionLabel} title={choice.actionLabel}>
                  <ArrowDownRight aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>

          <p className="visit-choice-caption"><RevealLine direction="right">{visitChoices.caption}</RevealLine></p>
        </div>

        <figure className="visit-push-up-media" ref={pushUpMediaRef}>
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
