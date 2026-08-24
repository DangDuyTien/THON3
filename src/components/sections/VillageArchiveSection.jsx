import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Plus, Upload, CheckCircle2, X, AlertCircle, Trash2, UserRound } from "lucide-react";
import AdaptiveImage from "../AdaptiveImage.jsx";
import RevealLine from "../RevealLine.jsx";
import YouthUnionPartyLogo from "../icons/YouthUnionPartyLogo.jsx";
import { useSiteContent } from "../../content/SiteContentProvider.jsx";
import { useSectionProgress, useViewportEntryProgress } from "../../hooks/useMotion.js";
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

function getArchiveImageSize(card) {
  return card.size.includes("wide") || card.size.includes("feature") ? "medium" : "small";
}

function getArchiveImageSizes(card) {
  return card.size.includes("wide") ? "(max-width: 680px) 90vw, 50vw" : "(max-width: 680px) 44vw, 25vw";
}

function isImageValue(value) {
  if (!value) return false;
  if (value.startsWith("data:image/")) return true;
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
  const sectionRef = useRef(null);
  const cardRefs = useRef([]);
  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const successTimerRef = useRef(null);
  const firstErrorRef = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [imageErrors, setImageErrors] = useState({});

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [school, setSchool] = useState("");
  const [imageSrc, setImageSrc] = useState("");
  const [altImageSrc, setAltImageSrc] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [altImageFile, setAltImageFile] = useState(null);

  const prewarmArchiveMedia = useCallback(() => {
    villageArchive.cards.forEach((card, index) => {
      if (!card.imageSrc) return;
      const alternateCard = villageArchive.cards[(index + 1) % villageArchive.cards.length] || card;
      const imageSize = getArchiveImageSize(card);
      const imageSizes = getArchiveImageSizes(card);
      prewarmCmsImage(card.imageSrc, imageSize, imageSizes, card.colorVariant);
      if (alternateCard.imageSrc) {
        prewarmCmsImage(alternateCard.imageSrc, imageSize, imageSizes, alternateCard.colorVariant);
      }
    });
  }, [villageArchive.cards, villageArchive.imageSrc]);

  useEffect(() => {
    prewarmArchiveMedia();
  }, [prewarmArchiveMedia]);

  useEffect(() => () => {
    if (imageSrc.startsWith("blob:")) URL.revokeObjectURL(imageSrc);
  }, [imageSrc]);

  useEffect(() => () => {
    if (altImageSrc.startsWith("blob:")) URL.revokeObjectURL(altImageSrc);
  }, [altImageSrc]);

  useSectionProgress(sectionRef, reducedMotion, (progress) => {
    villageArchive.cards.forEach((_, index) => {
      const entryProgress = Math.min(progress * 2.5, 1);
      const reveal = Math.min(Math.max((entryProgress - index * 0.065) / 0.5, 0), 1);
      cardRefs.current[index]?.style.setProperty("--archive-card-reveal", `${reveal}`);
    });
  }, undefined, {
    name: "village-archive",
    prewarm: prewarmArchiveMedia,
    willChange: "opacity, transform",
    willChangeTargets: () => cardRefs.current.slice(0, window.innerWidth <= 680 ? 4 : 6),
  });

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
    if (!imageSrc || !isImageValue(imageSrc) || imageErrors.imageSrc) next.imageSrc = "Ảnh chính là thông tin bắt buộc và phải tải được.";
    if (altImageSrc && (!isImageValue(altImageSrc) || imageErrors.altImageSrc)) next.altImageSrc = "Không thể sử dụng ảnh hover này.";
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
        const alternateFile = altImageSrc ? await fileFromImageSource(altImageSrc, altImageFile, "anh-the-hover.jpg") : null;
        const primary = await uploadSubmissionMedia(primaryFile);
        const alternate = alternateFile ? await uploadSubmissionMedia(alternateFile) : null;
        await createSubmission({ name: name.trim(), age: age.trim(), school: school.trim(), imageAssetId: primary.id, altImageAssetId: alternate?.id });
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
        setAltImageSrc("");
        setImageFile(null);
        setAltImageFile(null);
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
      <div className="village-archive-heading">
        <p className="village-archive-eyebrow">
          <YouthUnionPartyLogo size={24} />
          <RevealLine>{villageArchive.eyebrow}</RevealLine>
        </p>
        <h2 id="archive-title">
          {villageArchive.title.split("\n").map((line, index) => (
            <RevealLine direction={index % 2 === 0 ? "right" : "left"} key={line}>{line}</RevealLine>
          ))}
        </h2>
      </div>

      <div className="village-archive-grid">
        {villageArchive.cards.map((card, index) => {
          const alternateCard = villageArchive.cards[(index + 1) % villageArchive.cards.length] || card;
          const imageSrc = String(card.imageSrc || "").trim();
          const altImage = card.altImageSrc || alternateCard.imageSrc || imageSrc;
          const hasMemberDetails = Boolean(String(card.label || "").trim() || String(card.year || "").trim());
          const imageSize = getArchiveImageSize(card);
          const imageSizes = getArchiveImageSizes(card);
          return (
            <figure
              className={`village-archive-card village-archive-card-${String(card.size || "medium").split("-")[0]} village-archive-card-shape-${index % 4}${imageSrc ? "" : " village-archive-card-empty"}`}
              key={card.id}
              data-preview-target={`archive-${card.id}`}
              ref={(node) => { cardRefs.current[index] = node; }}
            >
              <div className="village-archive-media">
                {imageSrc ? (
                  <>
                    <div className="village-archive-media-layer village-archive-media-layer-alt" aria-hidden="true">
                      <AdaptiveImage src={altImage} alt="" colorVariant={alternateCard.colorVariant} loading="lazy" imagePosition={alternateCard.imagePosition || card.imagePosition} imageVariant={imageSize} sizes={imageSizes} />
                    </div>
                    <div className="village-archive-media-layer village-archive-media-layer-front">
                      <AdaptiveImage src={imageSrc} alt={card.imageAlt} colorVariant={card.colorVariant} loading="lazy" imagePosition={card.imagePosition} imageVariant={imageSize} sizes={imageSizes} />
                    </div>
                  </>
                ) : (
                  <div className="village-archive-empty-avatar" aria-label="Chưa có ảnh đoàn viên">
                    <UserRound aria-hidden="true" />
                  </div>
                )}
              </div>

              {hasMemberDetails && (
                <figcaption>
                  {card.label && <span className="archive-card-label"><RevealLine direction={index % 2 === 0 ? "left" : "right"}>{card.label}</RevealLine></span>}
                  {card.year && <strong className="archive-card-meta"><RevealLine direction={index % 2 === 0 ? "right" : "left"}>{card.year}</RevealLine></strong>}
                </figcaption>
              )}
            </figure>
          );
        })}

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
                <div className="youth-modal-header">
                  <div className="youth-modal-meta">
                    <span>01 / ĐĂNG KÝ</span>
                    <YouthUnionPartyLogo size={18} aria-hidden="true" />
                  </div>
                  <h4 id="youth-modal-title">THÊM THẺ ĐOÀN VIÊN</h4>
                  <p id="youth-modal-description">Gửi thông tin để Ban quản trị kiểm tra trước khi hiển thị trong danh sách.</p>
                </div>

                {Object.keys(errors).length > 0 && (
                  <div className="youth-form-error-summary" role="alert">
                    <AlertCircle aria-hidden="true" />
                    <span>Vui lòng kiểm tra lại các mục được đánh dấu.</span>
                  </div>
                )}

                <div className="youth-modal-section">
                  <p className="youth-modal-section-title">THÔNG TIN ĐOÀN VIÊN</p>
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
                    <div className="youth-form-group youth-form-full">
                      <label htmlFor="youth-role">Vai trò</label>
                      <input id="youth-role" type="text" value={YOUTH_MEMBER_ROLE} readOnly />
                    </div>
                  </div>
                </div>

                <div className="youth-modal-section">
                  <p className="youth-modal-section-title">ẢNH THẺ</p>
                  <div className="youth-form-group youth-form-full">
                    <label htmlFor="youth-image-src">Ảnh chính <b>*</b></label>
                    <span className="youth-field-hint">Dùng ảnh chân dung rõ mặt, dán đường dẫn hoặc chọn tệp tối đa 4 MB.</span>
                    <div className={`youth-image-input-box${errors.imageSrc ? " is-invalid" : ""}`}>
                      <input id="youth-image-src" type="url" placeholder="Dán link ảnh https://..." value={imageSrc} aria-invalid={Boolean(errors.imageSrc)} aria-describedby={errors.imageSrc ? "youth-image-error" : undefined} onChange={updateImageField(setImageSrc, setImageFile, "imageSrc")} />
                      <label className="youth-file-upload-btn">
                        <Upload className="youth-upload-icon" aria-hidden="true" />
                        <span>Chọn ảnh</span>
                        <input type="file" accept={MEDIA_ACCEPT} onChange={(event) => handleFileChange(event, setImageSrc, setImageFile, "imageSrc")} hidden />
                      </label>
                    </div>
                    {imageSrc && !imageErrors.imageSrc && <div className="youth-img-preview-row"><img src={imageSrc} alt="Xem trước ảnh chính" className="youth-preview-thumb" onError={() => setImageErrors((current) => ({ ...current, imageSrc: true }))} /><span className="youth-preview-text">Đã chọn ảnh chính</span><button type="button" className="youth-preview-remove" onClick={() => clearImage(setImageSrc, setImageFile, "imageSrc")} aria-label="Xóa ảnh chính"><Trash2 aria-hidden="true" /></button></div>}
                    {errors.imageSrc && <span className="youth-field-error" id="youth-image-error">{errors.imageSrc}</span>}
                  </div>

                  <div className="youth-form-group youth-form-full">
                    <label htmlFor="youth-alt-image-src">Ảnh hover <span>(tùy chọn)</span></label>
                    <span className="youth-field-hint">Ảnh này xuất hiện khi rê chuột trên thẻ. Có thể bỏ trống.</span>
                    <div className={`youth-image-input-box${errors.altImageSrc ? " is-invalid" : ""}`}>
                      <input id="youth-alt-image-src" type="url" placeholder="Dán link ảnh phụ hoặc chọn tệp" value={altImageSrc} aria-invalid={Boolean(errors.altImageSrc)} aria-describedby={errors.altImageSrc ? "youth-alt-image-error" : undefined} onChange={updateImageField(setAltImageSrc, setAltImageFile, "altImageSrc")} />
                      <label className="youth-file-upload-btn">
                        <Upload className="youth-upload-icon" aria-hidden="true" />
                        <span>Chọn ảnh</span>
                        <input type="file" accept={MEDIA_ACCEPT} onChange={(event) => handleFileChange(event, setAltImageSrc, setAltImageFile, "altImageSrc")} hidden />
                      </label>
                    </div>
                    {altImageSrc && !imageErrors.altImageSrc && <div className="youth-img-preview-row"><img src={altImageSrc} alt="Xem trước ảnh hover" className="youth-preview-thumb" onError={() => setImageErrors((current) => ({ ...current, altImageSrc: true }))} /><span className="youth-preview-text">Đã chọn ảnh hover</span><button type="button" className="youth-preview-remove" onClick={() => clearImage(setAltImageSrc, setAltImageFile, "altImageSrc")} aria-label="Xóa ảnh hover"><Trash2 aria-hidden="true" /></button></div>}
                    {errors.altImageSrc && <span className="youth-field-error" id="youth-alt-image-error">{errors.altImageSrc}</span>}
                  </div>
                </div>

                <div className="youth-modal-actions">
                  <button type="button" className="youth-btn-cancel" onClick={closeModal}>Hủy bỏ</button>
                  <button type="submit" className="youth-btn-submit" disabled={isSubmitting}>GỬI ĐĂNG KÝ CHO ADMIN DUYỆT</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
});
