import { memo, useCallback, useRef } from "react";
import { ArrowDownRight } from "lucide-react";
import AdaptiveImage from "../AdaptiveImage.jsx";
import RevealLine from "../RevealLine.jsx";
import RevealLines from "../RevealLines.jsx";
import { useSiteContent } from "../../content/SiteContentProvider.jsx";
import { useSectionProgress } from "../../hooks/useMotion.js";
import { prewarmCmsImage } from "../../media.js";
import { smoothStep } from "../../utils/math.js";

const gatePanels = [
  { id: "left", imagePosition: "18% 50%" },
  { id: "center", imagePosition: "50% 50%" },
  { id: "right", imagePosition: "82% 50%" },
];

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
    prewarmCmsImage(gate.imageSrc, "medium", "(max-width: 680px) 92vw, min(72vw, 980px)");
    prewarmCmsImage(visitChoices.left.imageSrc, "small", "(max-width: 680px) 56vw, 20vw");
    prewarmCmsImage(visitChoices.right.imageSrc, "small", "(max-width: 680px) 56vw, 20vw");
    prewarmCmsImage(fullBleedArrival.imageSrc, "full", "100vw");
  }, [fullBleedArrival.imageSrc, gate.imageSrc, visitChoices.left.imageSrc, visitChoices.right.imageSrc]);

  const applyProgress = (viewport) => {
    const stageProgress = stageProgressRef.current;
    const coverProgress = smoothStep(stageProgress / 0.78);
    const baseRevealProgress = Math.min(entryProgressRef.current, 1 - coverProgress);
    const sideReveal = smoothStep(baseRevealProgress);
    const sideTravel = viewport.isCompact ? 30 : 24;
    const sideOpacity = 0.06 + sideReveal * 0.94;
    const arrivalImageScale = 1.04 + coverProgress * 0.06;

    baseRef.current?.style.setProperty("--reveal-progress", `${sideReveal}`);

    if (gateMediaMotionRef.current) {
      gateMediaMotionRef.current.style.opacity = `${sideOpacity}`;
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
      gateMediaMotionRef.current,
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
          <figure className="visit-gate-media" role="img" aria-label={gate.imageAlt} data-preview-target="visit-gate">
            <div className="visit-gate-media-motion" ref={gateMediaMotionRef}>
              <div className="visit-gate-panels" aria-hidden="true">
                {gatePanels.map((panel) => (
                  <div className={`visit-gate-panel visit-gate-panel-${panel.id}`} key={panel.id}>
                    <AdaptiveImage
                      src={gate.imageSrc}
                      alt=""
                      imagePosition={panel.imagePosition}
                      imageVariant="medium"
                      sizes="(max-width: 680px) 30vw, min(24vw, 320px)"
                    />
                  </div>
                ))}
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
                <div className="visit-choice-mobile-media" aria-hidden="true">
                  <AdaptiveImage
                    src={choice.imageSrc}
                    alt={choice.imageAlt || ""}
                    imagePosition={choice.imagePosition}
                    imageVariant="small"
                    sizes="(max-width: 680px) 90vw, 20vw"
                  />
                </div>
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
