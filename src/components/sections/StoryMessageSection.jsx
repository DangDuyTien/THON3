import { memo, useEffect, useRef } from "react";
import AdaptiveImage from "../AdaptiveImage.jsx";
import RevealLine from "../RevealLine.jsx";
import RevealLines from "../RevealLines.jsx";
import { useSiteContent } from "../../content/SiteContentProvider.jsx";
import { useSectionProgress } from "../../hooks/useMotion.js";
import { smoothStep } from "../../utils/math.js";

export default memo(function StoryMessageSection({ contourCanvasRef, reducedMotion }) {
  const { content } = useSiteContent();
  const { villageMessage } = content;
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const marqueeCopies = Array.from({ length: 4 });

  useSectionProgress(sectionRef, reducedMotion, (progress, _velocity, viewport) => {
    const stage = stageRef.current;
    if (!stage) return;

    const photoShrink = smoothStep(progress / 0.62);
    const backdropReveal = smoothStep(progress / 0.58);
    const contentReveal = smoothStep((progress - 0.28) / 0.42);
    const signatureDraw = smoothStep((progress - 0.66) / 0.24);
    const compactViewport = viewport.isCompact;
    const photoScaleX = 1 - photoShrink * (compactViewport ? 0.24 : 0.64);
    const photoScaleY = 1 - photoShrink * (compactViewport ? 0.46 : 0.4);
    const titleTravel = (1 - contentReveal) * (compactViewport ? 70 : 44);

    stage.style.setProperty("--story-backdrop-reveal", `${backdropReveal}`);
    stage.style.setProperty("--story-content-reveal", `${contentReveal}`);
    stage.style.setProperty("--reveal-progress", `${reducedMotion ? 1 : contentReveal}`);
    stage.style.setProperty("--story-content-y", `${(1 - contentReveal) * 34}px`);
    stage.style.setProperty("--story-photo-shrink", `${photoShrink}`);
    stage.style.setProperty("--story-photo-scale-x", `${photoScaleX}`);
    stage.style.setProperty("--story-photo-scale-y", `${photoScaleY}`);
    stage.style.setProperty("--story-signature-clip", `${(1 - signatureDraw) * 100}%`);
    stage.style.setProperty("--story-signature-dash", `${1 - signatureDraw}`);
    stage.style.setProperty("--story-signature-reveal", `${signatureDraw}`);
    stage.style.setProperty("--story-signature-scale", `${0.92 + signatureDraw * 0.08}`);
    stage.style.setProperty("--story-signature-word-dash", `${(1 - signatureDraw) * 3600}px`);
    stage.style.setProperty("--story-title-left-x", `-${titleTravel}vw`);
    stage.style.setProperty("--story-title-right-x", `${titleTravel}vw`);

    const contourCanvas = contourCanvasRef.current;
    if (contourCanvas) contourCanvas.style.opacity = `${smoothStep(progress / 0.62)}`;
  }, 1, {
    name: "story-message",
    willChange: "transform, opacity",
    willChangeTargets: () => [
      stageRef.current,
      stageRef.current?.querySelector(".story-message-photo"),
      stageRef.current?.querySelector(".story-message-kicker"),
      stageRef.current?.querySelector(".story-message-title"),
      stageRef.current?.querySelector(".story-message-signature"),
      stageRef.current?.querySelector(".story-message-summary"),
    ],
  });

  useEffect(() => () => {
    const contourCanvas = contourCanvasRef.current;
    if (contourCanvas) contourCanvas.style.opacity = "";
  }, [contourCanvasRef]);

  return (
    <section
      className={`story-message-section${reducedMotion ? " story-message-reduced-motion" : ""}`}
      id="cau-chuyen"
      ref={sectionRef}
      aria-labelledby="intro-title"
    >
      <div className="story-message-stage" ref={stageRef}>
        <p className="story-message-kicker eyebrow"><span /> <RevealLine>{villageMessage.eyebrow}</RevealLine></p>

        <h2 id="intro-title" className="story-message-title">
          <RevealLine className="story-message-title-line story-message-title-line-left" direction="right">
            <span className="story-message-title-track">
              {marqueeCopies.map((_, index) => (
                <span className="story-message-title-copy" aria-hidden={index !== 0} key={`top-${index}`}>
                  {villageMessage.headlineTop}
                </span>
              ))}
            </span>
          </RevealLine>
          <RevealLine className="story-message-title-line story-message-title-line-right" direction="left">
            <span className="story-message-title-track">
              {marqueeCopies.map((_, index) => (
                <span className="story-message-title-copy" aria-hidden={index !== 0} key={`bottom-${index}`}>
                  {villageMessage.headlineBottom}
                </span>
              ))}
            </span>
          </RevealLine>
        </h2>

        <figure className="story-message-photo" data-preview-target="story-main">
          <AdaptiveImage
            src={villageMessage.imageSrc}
            alt={villageMessage.imageAlt}
            colorVariant={villageMessage.colorVariant}
            imagePosition={villageMessage.imagePosition}
            imageVariant="ultra"
            sizes="100vw"
          />
        </figure>

        <div className="story-message-signature" aria-label={villageMessage.signatureAlt} data-preview-target="story-signature">
          {villageMessage.signatureImage ? (
            <img src={villageMessage.signatureImage} alt={villageMessage.signatureAlt} />
          ) : (
            <svg className="signature-writing" viewBox="0 0 900 250" aria-hidden="true">
              <text className="signature-writing-word" x="84" y="164">{villageMessage.signatureText}</text>
              <path className="signature-writing-flourish" d="M72 190 C230 244 468 212 824 130" pathLength="1" />
            </svg>
          )}
        </div>

        <p className="story-message-summary"><RevealLines direction="left">{villageMessage.summary}</RevealLines></p>
      </div>
    </section>
  );
});
