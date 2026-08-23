import { memo, useEffect, useRef } from "react";
import { ArrowDownRight } from "lucide-react";
import AdaptiveImage from "../AdaptiveImage.jsx";
import RevealLine from "../RevealLine.jsx";
import RevealLines from "../RevealLines.jsx";
import { useSiteContent } from "../../content/SiteContentProvider.jsx";
import { useSectionProgress } from "../../hooks/useMotion.js";

export default memo(function Hero({ reducedMotion, heroRevealReady }) {
  const { content } = useSiteContent();
  const { storyFrames, settings } = content;
  const revealEnabled = heroRevealReady || reducedMotion;
  const copyRef = useRef(null);
  const imageRef = useRef(null);
  const mobilePanDistanceRef = useRef(0);
  const mobilePanProgressRef = useRef(0);
  const sectionRef = useRef(null);
  const frame = storyFrames[0] || {
    imageSrc: "/assets/village-hero.jpg",
    eyebrow: "HÀNH TRÌNH VỀ MÊ LINH",
   lead: "Xã",
    accent: "Mê Linh",
    description: "Nơi những con đường làng và câu chuyện quê hiện lên qua nhịp sống hôm nay.",
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
    document.documentElement.classList.add("react-hero-ready");
    return () => document.documentElement.classList.remove("react-hero-ready");
  }, []);

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

  useEffect(() => {
    const copy = copyRef.current;
    if (!copy) return undefined;
    if (reducedMotion) {
      copy.style.setProperty("--reveal-progress", "1");
      return undefined;
    }

    let frameId = 0;
    let startTime = 0;
    const animate = (time) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / 780, 1);
      copy.style.setProperty("--reveal-progress", `${progress}`);
      if (progress < 1) frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [reducedMotion]);

  return (
    <section ref={sectionRef} className={`hero${reducedMotion ? " hero-reduced-motion" : ""}`} id="home" aria-labelledby="hero-title">
      <div className="hero-stage">
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
          <div className="story-slide-wash" aria-hidden="true" />

          <div className="story-slide-copy" ref={copyRef} style={{ "--reveal-progress": reducedMotion ? 1 : 0, opacity: 1 }}>
            <p className="eyebrow"><span /> <RevealLine enabled={revealEnabled}>{frame.eyebrow}</RevealLine></p>
            <h1 id="hero-title" className="story-title">
              <RevealLine direction="right" enabled={revealEnabled}>{frame.lead}</RevealLine>
              <RevealLine direction="left" enabled={revealEnabled}><em>{frame.accent}</em></RevealLine>
            </h1>
            <p className="hero-intro"><RevealLines direction="left" enabled={revealEnabled}>{frame.description}</RevealLines></p>
            <a className="command-link" href="/cau-chuyen">
              <RevealLine direction="right" enabled={revealEnabled}>Đi vào câu chuyện</RevealLine>
              <ArrowDownRight aria-hidden="true" />
            </a>
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
