import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, Plus, Upload, CheckCircle2, X, AlertCircle, Trash2, UserRound, Send } from "lucide-react";
import AdaptiveImage from "../AdaptiveImage.jsx";
import YouthUnionPartyLogo from "../icons/YouthUnionPartyLogo.jsx";
import { useSiteContent } from "../../content/SiteContentProvider.jsx";
import { observeRevealIntersection, waitForRevealVisibility } from "../../reveal-observers.js";
import { prewarmCmsImage } from "../../media.js";
import { createSubmission } from "../../lib/submission-api.js";
import { MAX_SUBMISSION_MEDIA_BYTES, MEDIA_ACCEPT, uploadSubmissionMedia } from "../../lib/media-api.js";
import { isBackendConfigured } from "../../lib/backend-api.js";
import {
  isValidYouthBirthYear,
  isYouthSchoolOption,
  YOUTH_MEMBER_ROLE,
  YOUTH_SCHOOL_OPTIONS,
} from "../../lib/submission-options.js";

const FOCUSABLE_SELECTOR = "button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex=\"-1\"])";
const LEADERSHIP_ROLE_FALLBACKS = ["Bí thư", "Phó Bí thư", "Phó Bí thư"];
const STORY_TRANSITION_MS = 760;
const STORY_PAGE_STAGGER_MS = Math.round(STORY_TRANSITION_MS * 0.2);
const STORY_TRANSITION_TOTAL_MS = STORY_TRANSITION_MS + STORY_PAGE_STAGGER_MS;
const STORY_TEXT_REVEAL_GAP_MS = 60;

function StoryTextReveal({ children, className = "", delay = 0, direction = "right" }) {
  return (
    <span
      className={`youth-team-text-reveal${className ? ` ${className}` : ""}`}
      data-reveal-direction={direction}
      style={{ "--story-text-delay": `${delay}ms` }}
    >
      <span className="youth-team-text-reveal-copy">{children}</span>
    </span>
  );
}

function getArchiveImageSize(card) {
  return card.size.includes("wide") || card.size.includes("feature") ? "medium" : "small";
}

function getArchiveImageSizes(card) {
  return card.size.includes("wide") ? "(max-width: 680px) 90vw, 50vw" : "(max-width: 680px) 44vw, 25vw";
}

function ArchiveStoryMedia({ card, fallbackLabel, priority = false }) {
  const imageSrc = String(card?.imageSrc || "").trim();

  if (!imageSrc) {
    return (
      <div className="youth-team-story-placeholder" aria-label={`Chưa có ảnh thẻ của ${fallbackLabel}`}>
        <div className="youth-team-story-placeholder-portrait" aria-hidden="true">
          <UserRound />
        </div>
        <strong>CHƯA CÓ ẢNH THẺ</strong>
        <span>{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <AdaptiveImage
      src={imageSrc}
      alt={card.imageAlt || `${fallbackLabel} Đoàn Thanh niên Mê Linh`}
      colorVariant={card?.colorVariant}
      imagePosition={card?.imagePosition}
      imageVariant="medium"
      loading={priority ? "eager" : "lazy"}
      priority={priority}
      sizes="(max-width: 680px) 100vw, 50vw"
    />
  );
}

function ArchiveStorySlide({
  archive,
  direction,
  storyCards,
  onNext,
  onPrevious,
  revealDelayOffset = 0,
  slideIndex,
  state,
}) {
  const isIntro = slideIndex === 0;
  const leaderIndex = slideIndex - 1;
  const card = isIntro ? storyCards.find((item) => String(item?.imageSrc || "").trim()) : storyCards[leaderIndex];
  const role = isIntro
    ? ""
    : String(card?.year || "").trim() || LEADERSHIP_ROLE_FALLBACKS[leaderIndex] || YOUTH_MEMBER_ROLE;
  const name = isIntro ? "" : String(card?.label || "").trim() || "Đang cập nhật";
  const bio = String(card?.bio || "").trim()
    || (leaderIndex < 3
      ? "Thông tin giới thiệu đang được Ban Chấp hành cập nhật."
      : "Thông tin đoàn viên đang được cập nhật.");
  const nextCard = storyCards[leaderIndex + 1];
  const nextCardIndex = leaderIndex + 1;
  const nextName = String(nextCard?.label || "").trim();
  const nextRole = String(nextCard?.year || "").trim() || LEADERSHIP_ROLE_FALLBACKS[nextCardIndex] || YOUTH_MEMBER_ROLE;
  const nextLabel = isIntro
    ? (storyCards.length ? "Gặp Ban Chấp hành" : "")
    : nextCard
      ? nextCardIndex >= 3 ? `Gặp ${nextName || "đoàn viên tiếp theo"}` : `Gặp ${nextRole}`
      : "";
  const panelClassName = [
    "youth-team-story-panel",
    `is-${state}`,
    `is-direction-${direction}`,
    `youth-team-palette-${slideIndex % 4}`,
    !isIntro && leaderIndex % 2 === 1 ? "is-reversed" : "",
  ].filter(Boolean).join(" ");

  return (
    <article className={panelClassName} aria-hidden={state === "leaving" ? "true" : undefined} inert={state === "leaving" ? true : undefined}>
      <div
        className="youth-team-story-media"
        data-preview-target={!isIntro && card?.id ? `archive-${card.id}` : undefined}
      >
        <ArchiveStoryMedia
          card={card}
          fallbackLabel={isIntro ? "Gương mặt tuổi trẻ Mê Linh" : name}
          priority={slideIndex <= 1}
        />
        <span className="youth-team-story-media-index" aria-hidden="true">
          {String(slideIndex + 1).padStart(2, "0")}
        </span>
      </div>

      <div className="youth-team-story-copy">
        {slideIndex > 0 && (
          <button className="youth-team-story-back" type="button" onMouseDown={(event) => { event.preventDefault(); event.currentTarget.blur(); }} onClick={onPrevious} aria-label="Quay lại màn trước">
            <ArrowLeft aria-hidden="true" />
          </button>
        )}

        {isIntro ? (
          <div className="youth-team-intro-copy">
            <p className="youth-team-story-eyebrow">
              <YouthUnionPartyLogo size={25} />
              <StoryTextReveal delay={revealDelayOffset + 80}>{archive.eyebrow}</StoryTextReveal>
            </p>
            <h3 className="youth-team-intro-title">
              {archive.title.split("\n").map((line, index) => (
                <StoryTextReveal
                  delay={revealDelayOffset + 140 + index * 140}
                  direction={index % 2 === 0 ? "right" : "left"}
                  key={`${line}-${index}`}
                >
                  {line}
                </StoryTextReveal>
              ))}
            </h3>
            <p className="youth-team-story-lead">
              <StoryTextReveal delay={revealDelayOffset + 360}>{archive.intro}</StoryTextReveal>
            </p>
          </div>
        ) : (
          <div className="youth-team-leader-copy">
            <p className="youth-team-story-role">
              <StoryTextReveal delay={revealDelayOffset + 80}>{role}</StoryTextReveal>
            </p>
            <h3><StoryTextReveal delay={revealDelayOffset + 200} direction="left">{name}</StoryTextReveal></h3>
            <span className="youth-team-story-divider" aria-hidden="true" />
            <p className="youth-team-story-bio">
              <StoryTextReveal delay={revealDelayOffset + 440}>{bio}</StoryTextReveal>
            </p>
          </div>
        )}

        {nextLabel && (
          <button className="youth-team-story-next" type="button" onMouseDown={(event) => { event.preventDefault(); event.currentTarget.blur(); }} onClick={onNext}>
            <StoryTextReveal delay={revealDelayOffset + 680} direction="left">{nextLabel}</StoryTextReveal>
            <ArrowDown aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}

function isImageValue(value) {
  if (!value) return false;
  if (value.startsWith("data:image/")) return true;
  if (value.startsWith("blob:")) return true;
  if (value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function fileFromImageSource(source, selectedFile, fallbackName) {
  if (selectedFile) return selectedFile;
  try {
    const response = await fetch(source);
    if (!response.ok) throw new Error();
    const blob = await response.blob();
    if (!MEDIA_ACCEPT.split(",").includes(blob.type)) throw new Error();
    if (blob.size > MAX_SUBMISSION_MEDIA_BYTES) throw new Error("too-large");
    return new File([blob], fallbackName, { type: blob.type });
  } catch (error) {
    if (error?.message === "too-large") throw new Error("Ảnh cần có dung lượng tối đa 4 MB.");
    throw new Error("Không thể đọc ảnh từ đường dẫn này. Hãy chọn tệp ảnh từ thiết bị.");
  }
}

export default memo(function VillageArchiveSection({ reducedMotion }) {
  const { content } = useSiteContent();
  const { villageArchive } = content;
  const canHover = typeof window !== "undefined"
    && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const sectionRef = useRef(null);
  const storyPointerStartRef = useRef(null);
  const storyTransitionTimerRef = useRef(null);
  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const successTimerRef = useRef(null);
  const firstErrorRef = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [imageErrors, setImageErrors] = useState({});
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [leavingStoryIndex, setLeavingStoryIndex] = useState(null);
  const [storyDirection, setStoryDirection] = useState("next");
  const [storyTextDelayOffset, setStoryTextDelayOffset] = useState(0);
  const [storyTextReady, setStoryTextReady] = useState(reducedMotion);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [school, setSchool] = useState("");
  const [imageSrc, setImageSrc] = useState("");
  const [imageFile, setImageFile] = useState(null);
  // Mỗi thẻ, kể cả vị trí đang chờ cập nhật, là một spread trong cuốn sách.
  const storyCards = villageArchive.cards;
  const storySlideCount = storyCards.length + 1;

  const prewarmArchiveMedia = useCallback(() => {
    const visibleCardCount = window.matchMedia("(max-width: 680px)").matches ? 4 : 6;
    villageArchive.cards.slice(0, visibleCardCount).forEach((card, index) => {
      if (!card.imageSrc) return;
      const alternateCard = villageArchive.cards[(index + 1) % villageArchive.cards.length] || card;
      const imageSize = getArchiveImageSize(card);
      const imageSizes = getArchiveImageSizes(card);
      prewarmCmsImage(card.imageSrc, imageSize, imageSizes, card.colorVariant);
      if (canHover && alternateCard.imageSrc) {
        prewarmCmsImage(alternateCard.imageSrc, imageSize, imageSizes, alternateCard.colorVariant);
      }
    });
  }, [canHover, villageArchive.cards]);

  useEffect(() => {
    if (window.matchMedia("(max-width: 680px)").matches) return undefined;
    prewarmArchiveMedia();
    return undefined;
  }, [prewarmArchiveMedia]);

  useEffect(() => {
    if (!storyTextReady || !window.matchMedia("(max-width: 680px)").matches) return;
    const nextCard = storyCards[activeStoryIndex];
    if (!nextCard?.imageSrc) return;
    prewarmCmsImage(
      nextCard.imageSrc,
      getArchiveImageSize(nextCard),
      getArchiveImageSizes(nextCard),
      nextCard.colorVariant,
    );
  }, [activeStoryIndex, storyCards, storyTextReady]);

  useEffect(() => {
    if (reducedMotion) {
      setStoryTextReady(true);
      return undefined;
    }

    const story = sectionRef.current?.querySelector(".youth-team-story");
    if (!story) return undefined;

    let hasRevealed = false;
    let stopWaitingForVisibility = null;
    const stopObserving = observeRevealIntersection(story, (isIntersecting) => {
      if (!isIntersecting || hasRevealed) return;
      hasRevealed = true;
      stopWaitingForVisibility = waitForRevealVisibility(story, () => setStoryTextReady(true));
    });

    return () => {
      stopObserving();
      stopWaitingForVisibility?.();
    };
  }, [reducedMotion]);

  useEffect(() => () => {
    if (imageSrc.startsWith("blob:")) URL.revokeObjectURL(imageSrc);
  }, [imageSrc]);

  useEffect(() => () => {
    if (storyTransitionTimerRef.current) window.clearTimeout(storyTransitionTimerRef.current);
  }, []);

  useEffect(() => {
    if (activeStoryIndex < storySlideCount) return;
    setActiveStoryIndex(Math.max(storySlideCount - 1, 0));
    setLeavingStoryIndex(null);
  }, [activeStoryIndex, storySlideCount]);

  const changeStorySlide = useCallback((nextIndex) => {
    if (nextIndex === activeStoryIndex || nextIndex < 0 || nextIndex >= storySlideCount || leavingStoryIndex !== null) return;
    const storyScrollTop = window.scrollY;
    if (storyTransitionTimerRef.current) window.clearTimeout(storyTransitionTimerRef.current);
    setStoryDirection(nextIndex > activeStoryIndex ? "next" : "previous");
    if (!reducedMotion) setLeavingStoryIndex(activeStoryIndex);
    setStoryTextDelayOffset(reducedMotion ? 0 : STORY_TRANSITION_TOTAL_MS + STORY_TEXT_REVEAL_GAP_MS);
    setActiveStoryIndex(nextIndex);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: storyScrollTop, left: 0, behavior: "auto" });
    });
    if (!reducedMotion) {
      storyTransitionTimerRef.current = window.setTimeout(() => {
        setLeavingStoryIndex(null);
        storyTransitionTimerRef.current = null;
      }, STORY_TRANSITION_TOTAL_MS);
    }
  }, [activeStoryIndex, leavingStoryIndex, reducedMotion, storySlideCount]);

  const showNextStory = useCallback(() => {
    if (activeStoryIndex < storySlideCount - 1) {
      changeStorySlide(activeStoryIndex + 1);
      return;
    }
  }, [activeStoryIndex, changeStorySlide, storySlideCount]);

  const showPreviousStory = useCallback(() => {
    changeStorySlide(activeStoryIndex - 1);
  }, [activeStoryIndex, changeStorySlide]);

  const handleStoryPointerDown = (event) => {
    if (event.pointerType === "mouse") return;
    storyPointerStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handleStoryPointerUp = (event) => {
    const start = storyPointerStartRef.current;
    storyPointerStartRef.current = null;
    if (!start || event.pointerType === "mouse") return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;
    if (deltaX < 0) showNextStory();
    else showPreviousStory();
  };

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setFormSubmitted(false);
    setErrors({});
    if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
  }, []);

  const openModal = (event) => {
    openerRef.current = event.currentTarget;
    setErrors({});
    setImageErrors({});
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!isModalOpen) return undefined;
    const previousActive = document.activeElement;
    document.documentElement.classList.add("youth-modal-open");
    document.body.classList.add("youth-modal-open");
    const focusDialog = () => dialogRef.current?.querySelector(FOCUSABLE_SELECTOR)?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const elements = [...dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR)];
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const frame = window.requestAnimationFrame(focusDialog);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.documentElement.classList.remove("youth-modal-open");
      document.body.classList.remove("youth-modal-open");
      if (previousActive?.focus) previousActive.focus();
    };
  }, [closeModal, isModalOpen]);

  const updateField = (setter, field) => (event) => {
    setter(event.target.value);
    setErrors((current) => ({ ...current, [field]: "" }));
    setImageErrors((current) => ({ ...current, [field]: false }));
  };

  const updateImageField = (setField, setFile, field) => (event) => {
    setField(event.target.value);
    setFile(null);
    setErrors((current) => ({ ...current, [field]: "" }));
    setImageErrors((current) => ({ ...current, [field]: false }));
  };

  const handleFileChange = (event, setField, setFile, field) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!MEDIA_ACCEPT.split(",").includes(file.type)) {
      setErrors((current) => ({ ...current, [field]: "Chỉ nhận ảnh JPG, PNG, WebP hoặc AVIF." }));
      return;
    }
    if (file.size > MAX_SUBMISSION_MEDIA_BYTES) {
      setErrors((current) => ({ ...current, [field]: "Ảnh cần có dung lượng tối đa 4 MB." }));
      return;
    }
    if (!isBackendConfigured) {
      setErrors((current) => ({ ...current, [field]: "Backend MySQL chưa kết nối nên chưa thể tải ảnh." }));
      return;
    }
    setField(URL.createObjectURL(file));
    setFile(file);
    setErrors((current) => ({ ...current, [field]: "" }));
    setImageErrors((current) => ({ ...current, [field]: false }));
  };

  const clearImage = (setField, setFile, field) => {
    setField("");
    setFile(null);
    setImageErrors((current) => ({ ...current, [field]: false }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validateForm = () => {
    const next = {};
    if (name.trim().length < 2 || name.trim().length > 80) next.name = "Họ tên cần từ 2–80 ký tự.";
    if (!isValidYouthBirthYear(age)) next.age = `Năm sinh phải gồm 4 chữ số, từ 1900 đến ${new Date().getFullYear()}.`;
    if (!isYouthSchoolOption(school)) next.school = "Vui lòng chọn một trong ba trường.";
    if (!imageSrc || !isImageValue(imageSrc) || imageErrors.imageSrc) next.imageSrc = "Ảnh thẻ là thông tin bắt buộc và phải tải được.";
    setErrors(next);
    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length) {
      window.requestAnimationFrame(() => firstErrorRef.current?.focus());
      return;
    }
    setIsSubmitting(true);
    try {
      if (isBackendConfigured) {
        const primaryFile = await fileFromImageSource(imageSrc, imageFile, "anh-the-chinh.jpg");
        const primary = await uploadSubmissionMedia(primaryFile);
        await createSubmission({ name: name.trim(), age: age.trim(), school: school.trim(), imageAssetId: primary.id });
      } else {
        throw new Error("Backend MySQL chưa kết nối nên chưa thể gửi đăng ký.");
      }
      setFormSubmitted(true);
      setErrors({});
      successTimerRef.current = window.setTimeout(() => {
        closeModal();
        setName("");
        setAge("");
        setSchool("");
        setImageSrc("");
        setImageFile(null);
        setImageErrors({});
      }, 2800);
    } catch (error) {
      setErrors({ submit: error?.message || "Không thể gửi dữ liệu lên máy chủ." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="village-archive-section" id="tu-lieu" ref={sectionRef} aria-labelledby="archive-title">
      <h2 className="sr-only" id="archive-title">{villageArchive.title.replace("\n", " ")}</h2>

      <div
        className={`youth-team-story is-direction-${storyDirection}${storyTextReady ? " is-text-ready" : ""}`}
        role="region"
        aria-label="Gương mặt Đoàn Thanh niên Mê Linh"
        onPointerDown={handleStoryPointerDown}
        onPointerUp={handleStoryPointerUp}
      >
        {leavingStoryIndex !== null && (
          <ArchiveStorySlide
            archive={villageArchive}
            direction={storyDirection}
            key={`leaving-${leavingStoryIndex}`}
            storyCards={storyCards}
            onNext={showNextStory}
            onPrevious={showPreviousStory}
            slideIndex={leavingStoryIndex}
            state="leaving"
          />
        )}
        <ArchiveStorySlide
          archive={villageArchive}
          direction={storyDirection}
          key={`active-${activeStoryIndex}`}
          storyCards={storyCards}
          onNext={showNextStory}
          onPrevious={showPreviousStory}
          revealDelayOffset={storyTextDelayOffset}
          slideIndex={activeStoryIndex}
          state="active"
        />
        <div className="youth-team-story-progress" aria-label={`Màn ${activeStoryIndex + 1} trên ${storySlideCount}`}>
          <span>{String(activeStoryIndex + 1).padStart(2, "0")}</span>
          <i aria-hidden="true" />
          <span>{String(storySlideCount).padStart(2, "0")}</span>
        </div>
      </div>

      {/* Minimal Right-Aligned Action Bar (No Frame) */}
      <div className="youth-union-join-inline">
        <div className="youth-inline-label">
          <YouthUnionPartyLogo size={20} style={{ marginRight: 8 }} />
          <span>THAM GIA DANH SÁCH ĐOÀN THANH NIÊN MÊ LINH</span>
        </div>
        <button
          className="youth-inline-add-btn"
          onClick={openModal}
          type="button"
          title="Đăng ký thêm thẻ Đoàn viên"
          aria-label="Đăng ký thêm thẻ Đoàn viên"
        >
          <Plus size={16} />
          <span>Đăng ký thẻ</span>
        </button>
      </div>

      {/* Registration Modal */}
      {isModalOpen && (
        <div
          className="youth-modal-backdrop"
          data-lenis-prevent
          onMouseDown={(event) => event.target === event.currentTarget && closeModal()}
        >
          <div
            className="youth-modal-card"
            data-lenis-prevent
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="youth-modal-title"
            aria-describedby="youth-modal-description"
          >
            <button className="youth-modal-close" onClick={closeModal} type="button" aria-label="Đóng cửa sổ đăng ký">
              <X aria-hidden="true" />
            </button>

            {formSubmitted ? (
              <div className="youth-modal-success" role="status" aria-live="polite">
                <CheckCircle2 className="youth-success-icon" aria-hidden="true" />
                <p className="youth-modal-eyebrow">02 / ĐÃ TIẾP NHẬN</p>
                <h4 id="youth-modal-title">ĐÃ GỬI ĐĂNG KÝ THÀNH CÔNG!</h4>
                <p id="youth-modal-description">Thông tin của bạn đã được gửi tới Ban quản trị xã Mê Linh. Thẻ sẽ xuất hiện sau khi được kiểm duyệt.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="youth-modal-form" noValidate>
                <aside className="youth-member-preview" aria-label="Xem trước thẻ đoàn viên">
                  <div className="youth-member-preview-head">
                    <span>ĐOÀN THANH NIÊN / MÊ LINH</span>
                    <span>THẺ ĐOÀN VIÊN</span>
                  </div>
                  <div className="youth-member-preview-photo">
                    {imageSrc && !imageErrors.imageSrc ? (
                      <img
                        src={imageSrc}
                        alt="Xem trước ảnh thẻ đoàn viên"
                        onError={() => setImageErrors((current) => ({ ...current, imageSrc: true }))}
                      />
                    ) : (
                      <div className="youth-member-preview-empty">
                        <UserRound aria-hidden="true" />
                        <span>ẢNH THẺ</span>
                      </div>
                    )}
                  </div>
                  <div className="youth-member-preview-identity">
                    <span>{YOUTH_MEMBER_ROLE}</span>
                    <strong>{name.trim() || "Họ và tên"}</strong>
                    <p>{[age.trim(), school].filter(Boolean).join(" • ") || "Năm sinh • Trường học"}</p>
                  </div>
                  <p className="youth-member-preview-note">Ảnh và thông tin này sẽ xuất hiện trên một trang đôi sau khi được duyệt.</p>
                </aside>

                <div className="youth-modal-form-pane">
                  <div className="youth-modal-header">
                    <div className="youth-modal-meta">
                      <span>01 / ĐĂNG KÝ</span>
                      <YouthUnionPartyLogo size={18} aria-hidden="true" />
                    </div>
                    <h4 id="youth-modal-title">ĐĂNG KÝ THẺ ĐOÀN VIÊN</h4>
                    <p id="youth-modal-description">Hoàn thiện hồ sơ và ảnh chân dung để xuất hiện trong cuốn sách Gương mặt tuổi trẻ.</p>
                  </div>

                  {Object.values(errors).some(Boolean) && (
                    <div className="youth-form-error-summary" role="alert">
                      <AlertCircle aria-hidden="true" />
                      <span>Vui lòng kiểm tra lại các mục được đánh dấu.</span>
                    </div>
                  )}

                  <div className="youth-modal-section">
                    <p className="youth-modal-section-title">THÔNG TIN HỒ SƠ</p>
                    <div className="youth-form-grid">
                      <div className="youth-form-group">
                        <label htmlFor="youth-name">Họ và tên đoàn viên <b>*</b></label>
                        <input id="youth-name" ref={errors.name ? firstErrorRef : null} type="text" maxLength={80} autoComplete="name" placeholder="Ví dụ: Nguyễn Văn An" value={name} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "youth-name-error" : undefined} onChange={updateField(setName, "name")} />
                        {errors.name && <span className="youth-field-error" id="youth-name-error">{errors.name}</span>}
                      </div>
                      <div className="youth-form-group">
                        <label htmlFor="youth-age">Năm sinh <b>*</b></label>
                        <input id="youth-age" ref={errors.age && !errors.name ? firstErrorRef : null} type="text" maxLength={4} inputMode="numeric" autoComplete="bday-year" placeholder="Ví dụ: 2008" value={age} aria-invalid={Boolean(errors.age)} aria-describedby={errors.age ? "youth-age-error" : undefined} onChange={updateField(setAge, "age")} />
                        {errors.age && <span className="youth-field-error" id="youth-age-error">{errors.age}</span>}
                      </div>
                      <div className="youth-form-group youth-form-full">
                        <label htmlFor="youth-school">Trường học <b>*</b></label>
                        <select id="youth-school" ref={errors.school && !errors.name && !errors.age ? firstErrorRef : null} value={school} aria-invalid={Boolean(errors.school)} aria-describedby={errors.school ? "youth-school-error" : undefined} onChange={updateField(setSchool, "school")}>
                          <option value="">Chọn trường học</option>
                          {YOUTH_SCHOOL_OPTIONS.map((option) => <option value={option} key={option}>{option}</option>)}
                        </select>
                        {errors.school && <span className="youth-field-error" id="youth-school-error">{errors.school}</span>}
                      </div>
                      <div className="youth-form-role youth-form-full">
                        <UserRound aria-hidden="true" />
                        <span><small>Vai trò đăng ký</small><strong>{YOUTH_MEMBER_ROLE}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="youth-modal-section youth-modal-photo-section">
                    <p className="youth-modal-section-title">ẢNH THẺ TRÊN MẶT SÁCH</p>
                    <div className="youth-form-group youth-form-full">
                      <label htmlFor="youth-image-src">Ảnh chân dung <b>*</b></label>
                      <span className="youth-field-hint" id="youth-image-hint">Chọn ảnh rõ mặt, khung dọc; nhận JPG, PNG, WebP hoặc AVIF tối đa 4 MB.</span>
                      <div className={`youth-photo-actions${errors.imageSrc ? " is-invalid" : ""}`}>
                        <label className="youth-file-upload-btn">
                          <Upload className="youth-upload-icon" aria-hidden="true" />
                          <span>{imageSrc ? "Đổi ảnh thẻ" : "Chọn ảnh thẻ"}</span>
                          <input type="file" accept={MEDIA_ACCEPT} onChange={(event) => handleFileChange(event, setImageSrc, setImageFile, "imageSrc")} hidden />
                        </label>
                        {imageSrc && (
                          <button type="button" className="youth-photo-clear" onClick={() => clearImage(setImageSrc, setImageFile, "imageSrc")}>
                            <Trash2 aria-hidden="true" />
                            <span>Xóa ảnh</span>
                          </button>
                        )}
                      </div>
                      <div className="youth-photo-url-divider"><span>HOẶC DÁN ĐƯỜNG DẪN ẢNH</span></div>
                      <input
                        id="youth-image-src"
                        ref={errors.imageSrc && !errors.name && !errors.age && !errors.school ? firstErrorRef : null}
                        type="url"
                        placeholder="https://..."
                        value={imageFile ? "" : imageSrc}
                        aria-invalid={Boolean(errors.imageSrc)}
                        aria-describedby={errors.imageSrc ? "youth-image-hint youth-image-error" : "youth-image-hint"}
                        onChange={updateImageField(setImageSrc, setImageFile, "imageSrc")}
                      />
                      {errors.imageSrc && <span className="youth-field-error" id="youth-image-error">{errors.imageSrc}</span>}
                    </div>
                  </div>

                  <div className="youth-modal-actions">
                    <button type="button" className="youth-btn-cancel" onClick={closeModal}>Hủy bỏ</button>
                    <button type="submit" className="youth-btn-submit" disabled={isSubmitting}>
                      <span>{isSubmitting ? "ĐANG GỬI..." : "GỬI ĐĂNG KÝ"}</span>
                      {!isSubmitting && (
                        <Send className="youth-upload-icon" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
});
