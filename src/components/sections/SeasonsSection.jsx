import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Waves } from "lucide-react";
import AdaptiveImage from "../AdaptiveImage.jsx";
import RevealLine from "../RevealLine.jsx";
import RevealLines from "../RevealLines.jsx";
import {
  getSeasonalGalleryFocus,
  getSeasonalGalleryMediaIds,
} from "../../content/site-content.js";
import { useSiteContent } from "../../content/SiteContentProvider.jsx";
import { useSectionProgress } from "../../hooks/useMotion.js";
import { prewarmCmsImage } from "../../media.js";
import { smoothStep } from "../../utils/math.js";

const SEASON_BASE_BACKGROUND = [10, 18, 32];
const SEASON_GALLERY_BACKGROUND = [5, 28, 56];
const SEASON_PAPER_BACKGROUND = [244, 248, 252];

function mixRgb(from, to, progress) {
  return from.map((channel, index) => Math.round(channel + (to[index] - channel) * progress));
}

function SeasonalGalleryPhotos({ photos, preview = false }) {
  return photos.map((photo, index) => (
    <figure
      className={`season-gallery-photo season-gallery-photo-${photo.id}`}
      key={photo.id}
      aria-hidden={preview || undefined}
      data-preview-target={`seasons-${photo.id}`}
    >
      <figcaption><RevealLine direction={index % 2 === 0 ? "right" : "left"}>{photo.label}</RevealLine></figcaption>
      <div className="season-gallery-photo-frame">
        <AdaptiveImage
          src={photo.imageSrc}
          alt={preview ? "" : photo.imageAlt}
          colorVariant={photo.colorVariant}
          imagePosition={photo.imagePosition}
          imageVariant="large"
          sizes="(max-width: 680px) 72vw, 32vw"
        />
      </div>
    </figure>
  ));
}

export default memo(function SeasonsSection({ reducedMotion }) {
  const { content } = useSiteContent();
  const { seasonalGallery } = content;
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const boardRef = useRef(null);
  const entryTrackRef = useRef(null);
  const progressLineRef = useRef(null);
  const galleryFocusRef = useRef(2);
  const [galleryFocus, setGalleryFocus] = useState(2);
  const [mediaReady, setMediaReady] = useState(reducedMotion);

  const prewarmGalleryWindow = useCallback((focus = galleryFocusRef.current) => {
    seasonalGallery.photos.forEach((photo, index) => {
      if (index < focus - 2 || index > focus + 3) return;
      prewarmCmsImage(photo.imageSrc, "large", "(max-width: 680px) 72vw, 32vw", photo.colorVariant);
    });
  }, [seasonalGallery.photos]);

  useEffect(() => {
    if (reducedMotion) {
      setMediaReady(true);
      return;
    }
    setMediaReady(false);
  }, [reducedMotion]);

  useEffect(() => {
    if (mediaReady) prewarmGalleryWindow(galleryFocus);
  }, [galleryFocus, mediaReady, prewarmGalleryWindow]);

  useSectionProgress(sectionRef, reducedMotion, (progress, _velocity, viewport, motion) => {
    const compactViewport = viewport.isCompact;
    const horizontalTravel = compactViewport ? 125 : 132;
    const horizontalOffset = -progress * horizontalTravel;
    // Start the tone while the section enters, then carry the color change
    // across the whole horizontal gallery instead of finishing at frame one.
    const galleryToneProgress = smoothStep(
      Math.min(motion.entryProgress * 0.18 + progress * 0.82, 1),
    );
    const nextSectionRevealProgress = smoothStep((progress - 0.72) / 0.28);
    const stageBackground = mixRgb(
      mixRgb(SEASON_BASE_BACKGROUND, SEASON_GALLERY_BACKGROUND, galleryToneProgress),
      SEASON_PAPER_BACKGROUND,
      nextSectionRevealProgress,
    );
    // Release the 61vw entry while the section enters, then finish the move
    // early in the sticky frame so every caption travels with its photo.
    const photoEntryProgress = Math.max(
      motion.entryProgress * 0.5,
      Math.min(progress / 0.32, 1),
    );
    const photoEntryOffset = reducedMotion
      ? 0
      : 61 * (1 - photoEntryProgress);
    const nextFocus = getSeasonalGalleryFocus(progress, horizontalTravel, seasonalGallery.photos.length);

    if (nextFocus !== galleryFocusRef.current) {
      galleryFocusRef.current = nextFocus;
      setGalleryFocus(nextFocus);
    }

    const nextTextColor = mixRgb([244, 248, 252], [5, 28, 56], nextSectionRevealProgress);
    if (stageRef.current) {
      stageRef.current.style.backgroundColor = `rgb(${stageBackground.join(", ")})`;
    }
    const revealProgress = reducedMotion ? 1 : smoothStep(motion.entryProgress);
    if (boardRef.current) {
      boardRef.current.style.setProperty("--reveal-progress", `${revealProgress}`);
      boardRef.current.style.setProperty("--season-next-color", `rgb(${nextTextColor.join(", ")})`);
      boardRef.current.style.transform = `translate3d(${horizontalOffset}vw, 0, 0)`;
    }
    if (entryTrackRef.current) {
      entryTrackRef.current.style.transform = `translate3d(${photoEntryOffset}vw, 0, 0)`;
    }
    if (progressLineRef.current) progressLineRef.current.style.transform = `scaleX(${progress})`;
  }, undefined, {
    activate: () => setMediaReady(true),
    name: "season-gallery",
    prewarm: () => {
      prewarmGalleryWindow();
      setMediaReady(true);
    },
    sleep: () => setMediaReady(false),
    updateWhilePrewarmed: true,
    willChange: "transform",
    willChangeTargets: () => [boardRef.current, entryTrackRef.current, stageRef.current],
  });

  const mountedPhotoIds = mediaReady
    ? getSeasonalGalleryMediaIds(galleryFocus, reducedMotion, seasonalGallery.photos)
    : new Set();

  return (
    <section
      className={`season-gallery-section${reducedMotion ? " season-gallery-reduced-motion" : ""}`}
      id="nhung-mua"
      ref={sectionRef}
      aria-labelledby="seasons-title"
    >
      <h2 className="sr-only" id="seasons-title">Nhịp sống trong năm</h2>
      <div className="season-gallery-stage" ref={stageRef}>
        <div
          className="season-gallery-board"
          ref={boardRef}
          style={{ "--season-photo-reveal": 1 }}
        >
          <div
            className="season-gallery-entry-track"
            ref={entryTrackRef}
            style={{ transform: reducedMotion ? "translate3d(0, 0, 0)" : "translate3d(61vw, 0, 0)" }}
          >
            <p className="season-gallery-mark">
              <Waves aria-hidden="true" />
              <RevealLine>{seasonalGallery.eyebrow}</RevealLine>
            </p>

            <div className="season-gallery-quote">
              <p><RevealLines direction="right">{seasonalGallery.quote}</RevealLines></p>
              <span><RevealLine direction="left">{seasonalGallery.signature}</RevealLine></span>
            </div>

            <div className="season-gallery-media-track">
              <SeasonalGalleryPhotos photos={seasonalGallery.photos} />
            </div>
          </div>

          <p className="season-gallery-next"><RevealLines direction="left">BƯỚC CHẬM QUA BỐN MÙA, GIỮ LẠI NHỮNG KHOẢNH KHẮC THUỘC VỀ LÀNG.</RevealLines></p>
          <div className="season-gallery-progress" aria-hidden="true"><span ref={progressLineRef} /></div>
        </div>
      </div>
    </section>
  );
});
