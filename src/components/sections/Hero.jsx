import { memo, useEffect, useRef } from "react";
import { ArrowDownRight } from "lucide-react";
import AdaptiveImage from "../AdaptiveImage.jsx";
import RevealLine from "../RevealLine.jsx";
import { useSiteContent } from "../../content/SiteContentProvider.jsx";

export default memo(function Hero({ reducedMotion }) {
  const { content } = useSiteContent();
  const { storyFrames, settings } = content;
  const copyRef = useRef(null);
  const frame = storyFrames[0] || {
    imageSrc: "/assets/village-hero.jpg",
    eyebrow: "HÀNH TRÌNH VỀ MÊ LINH",
   lead: "Xã",
    accent: "Mê Linh",
    description: "Nơi những con đường làng và câu chuyện quê hiện lên qua nhịp sống hôm nay.",
  };

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
    <section className={`hero${reducedMotion ? " hero-reduced-motion" : ""}`} id="home" aria-labelledby="hero-title">
      <div className="hero-stage">
        <article className="story-slide">
          <div className="story-slide-media" aria-hidden="true">
            <AdaptiveImage
              src={frame.imageSrc || "/assets/village-hero.jpg"}
              alt={settings.siteName}
              colorVariant={frame.colorVariant}
              imagePosition={frame.position}
              loading="eager"
              priority
              sizes="100vw"
            />
          </div>
          <div className="story-slide-wash" aria-hidden="true" />

          <div className="story-slide-copy" ref={copyRef} style={{ "--reveal-progress": reducedMotion ? 1 : 0, opacity: 1 }}>
            <p className="eyebrow"><span /> <RevealLine>{frame.eyebrow}</RevealLine></p>
            <h1 id="hero-title" className="story-title">
              <RevealLine direction="right">{frame.lead}</RevealLine>
              <RevealLine direction="left"><em>{frame.accent}</em></RevealLine>
            </h1>
            <p className="hero-intro"><RevealLine direction="left">{frame.description}</RevealLine></p>
            <a className="command-link" href="#cau-chuyen">
              <RevealLine direction="right">Đi vào câu chuyện</RevealLine>
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
