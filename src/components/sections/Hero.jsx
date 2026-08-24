import { memo, useEffect, useRef } from "react";
import AdaptiveImage from "../AdaptiveImage.jsx";
import { useSiteContent } from "../../content/SiteContentProvider.jsx";
import { useSectionProgress } from "../../hooks/useMotion.js";

export default memo(function Hero({ reducedMotion }) {
  const { content } = useSiteContent();
  const { storyFrames, settings } = content;
  const imageRef = useRef(null);
  const mobilePanDistanceRef = useRef(0);
  const mobilePanProgressRef = useRef(0);
  const sectionRef = useRef(null);
  const frame = storyFrames[0] || {
    imageSrc: "/assets/village-hero.jpg",
    colorVariant: "hero-home",
    position: "center 58%",
  };

  useSectionProgress(sectionRef, reducedMotion, (progress, _velocity, viewport) => {
    const image = imageRef.current;
    if (!image) return;

    const mobileProgress = viewport.isCompact ? progress : 0;
    mobilePanProgressRef.current = mobileProgress;
    image.style.setProperty(
      "--hero-mobile-pan",
      `${-mobilePanDistanceRef.current * mobileProgress}px`,
    );
  }, 0, {
    name: "hero-mobile-pan",
    willChange: "transform",
    willChangeTargets: () => imageRef.current,
  });

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return undefined;

    const markReady = () => document.documentElement.classList.add("react-hero-ready");
    if (image.complete && image.naturalWidth) markReady();
    else image.addEventListener("load", markReady, { once: true });

    return () => {
      image.removeEventListener("load", markReady);
      document.documentElement.classList.remove("react-hero-ready");
    };
  }, [frame.imageSrc]);

  useEffect(() => {
    const section = sectionRef.current;
    const image = imageRef.current;
    if (!section || !image) return undefined;

    const measureMobilePan = () => {
      if (window.innerWidth > 680 || reducedMotion || !image.naturalHeight) {
        mobilePanDistanceRef.current = 0;
        section.style.removeProperty("--hero-mobile-pan-distance");
        image.style.removeProperty("--hero-mobile-pan");
        return;
      }

      const media = image.closest(".story-slide-media");
      if (!media) return;
      const { height, width } = media.getBoundingClientRect();
      const renderedWidth = height * (image.naturalWidth / image.naturalHeight);
      const distance = Math.max(renderedWidth - width, 0);

      mobilePanDistanceRef.current = distance;
      section.style.setProperty("--hero-mobile-pan-distance", `${distance}px`);
      image.style.setProperty(
        "--hero-mobile-pan",
        `${-distance * mobilePanProgressRef.current}px`,
      );
    };

    if (image.complete) measureMobilePan();
    image.addEventListener("load", measureMobilePan);
    window.addEventListener("resize", measureMobilePan, { passive: true });

    return () => {
      image.removeEventListener("load", measureMobilePan);
      window.removeEventListener("resize", measureMobilePan);
    };
  }, [frame.imageSrc, reducedMotion]);

  return (
    <section ref={sectionRef} className={`hero${reducedMotion ? " hero-reduced-motion" : ""}`} id="home" aria-labelledby="hero-title">
      <div className="hero-stage">
        <h1 className="sr-only" id="hero-title">{settings.siteName}</h1>
        <article className="story-slide" data-preview-target="hero-0">
          <div className="story-slide-media">
            <AdaptiveImage
              ref={imageRef}
              src={frame.imageSrc || "/assets/village-hero.jpg"}
              alt={settings.siteName}
              colorVariant={frame.colorVariant}
              imagePosition={frame.position}
              imageVariant="ultra"
              loading="eager"
              priority
              sizes="(max-width: 680px) 150svh, 100vw"
            />
          </div>
        </article>

        <div className="hero-meta hero-meta-top" aria-hidden="true">
          <span>{settings.coordinates[0]}</span>
          <span>{settings.coordinates[1]}</span>
        </div>
      </div>
    </section>
  );
});
