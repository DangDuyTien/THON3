import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Plus, Upload, CheckCircle2, X, AlertCircle, Trash2 } from "lucide-react";
import AdaptiveImage from "../AdaptiveImage.jsx";
import RevealLine from "../RevealLine.jsx";
import YouthUnionPartyLogo from "../icons/YouthUnionPartyLogo.jsx";
import { useSiteContent } from "../../content/SiteContentProvider.jsx";
import { useViewportEntryProgress } from "../../hooks/useMotion.js";
import { prewarmCmsImage } from "../../media.js";
import { createSubmission } from "../../lib/submission-api.js";
import { createSignedMediaUrl, uploadMedia, SUBMISSION_MEDIA_BUCKET } from "../../lib/media-api.js";
import { isBackendConfigured } from "../../lib/backend-api.js";

const MAX_IMAGE_SIZE = 50 * 1024 * 1024;
const FOCUSABLE_SELECTOR = "button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex=\"-1\"])";

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

  const prewarmArchiveMedia = useCallback(() => {
    villageArchive.cards.forEach((card, index) => {
      const alternateCard = villageArchive.cards[(index + 1) % villageArchive.cards.length] || card;
      const imageSize = getArchiveImageSize(card);
      const imageSizes = getArchiveImageSizes(card);
      prewarmCmsImage(card.imageSrc || villageArchive.imageSrc, imageSize, imageSizes, card.colorVariant);
      prewarmCmsImage(alternateCard.imageSrc || villageArchive.imageSrc, imageSize, imageSizes, alternateCard.colorVariant);
    });
  }, [villageArchive.cards, villageArchive.imageSrc]);

  useViewportEntryProgress(sectionRef, reducedMotion, (progress) => {
    sectionRef.current?.style.setProperty("--reveal-progress", `${progress}`);
    villageArchive.cards.forEach((_, index) => {
      const reveal = Math.min(Math.max((progress - index * 0.065) / 0.5, 0), 1);
      cardRefs.current[index]?.style.setProperty("--archive-card-reveal", `${reveal}`);
    });
  }, undefined, {
    name: "village-archive",
    prewarm: prewarmArchiveMedia,
    willChange: "opacity, transform",
    willChangeTargets: () => cardRefs.current.slice(0, 6),
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
      document.body.classList.remove("youth-modal-open");
      if (previousActive?.focus) previousActive.focus();
    };
  }, [closeModal, isModalOpen]);

  const updateField = (setter, field) => (event) => {
    setter(event.target.value);
    setErrors((current) => ({ ...current, [field]: "" }));
    setImageErrors((current) => ({ ...current, [field]: false }));
  };

  const handleFileChange = (event, setField, field) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((current) => ({ ...current, [field]: "Vui lòng chọn một tệp hình ảnh." }));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setErrors((current) => ({ ...current, [field]: "Ảnh cần có dung lượng tối đa 4 MB." }));
      return;
    }
    if (!isBackendConfigured) {
      setErrors((current) => ({ ...current, [field]: "Backend MySQL chưa kết nối nên chưa thể tải ảnh." }));
      return;
    }
    setField(URL.createObjectURL(file));
  };

  const validateForm = () => {
    const next = {};
    if (name.trim().length < 2 || name.trim().length > 80) next.name = "Họ tên cần từ 2–80 ký tự.";
    if (!age.trim() || age.trim().length > 30) next.age = "Vui lòng nhập tuổi hoặc năm sinh.";
    if (school.trim().length < 2 || school.trim().length > 120) next.school = "Vui lòng nhập trường học hoặc nơi công tác.";
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
        const primary = await uploadMedia(await fetch(imageSrc).then((response) => response.blob()), { bucket: SUBMISSION_MEDIA_BUCKET });
        const alternate = altImageSrc ? await uploadMedia(await fetch(altImageSrc).then((response) => response.blob()), { bucket: SUBMISSION_MEDIA_BUCKET }) : null;
        await createSubmission({ name: name.trim(), age: age.trim(), school: school.trim(), imageAssetId: primary.id, altImageAssetId: alternate?.id });
      } else {
        throw new Error("Backend MySQL chưa kết nối nên chưa thể gửi đăng ký.");
      }
      setFormSubmitted(true);
      setErrors({});
    } catch (error) {
      setErrors({ submit: error?.message || "Không thể gửi dữ liệu lên máy chủ." });
    } finally {
      setIsSubmitting(false);
    }
    successTimerRef.current = window.setTimeout(() => {
      closeModal();
      setName("");
      setAge("");
      setSchool("");
      setImageSrc("");
      setAltImageSrc("");
      setImageErrors({});
    }, 2800);
  };

  return (
    <section className="village-archive-section" id="tu-lieu" ref={sectionRef} aria-labelledby="archive-title">
      <div className="village-archive-heading">
        <p className="village-archive-eyebrow">
          <YouthUnionPartyLogo size={24} style={{ marginRight: 8 }} />
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
          const altImage = card.altImageSrc || alternateCard.imageSrc || villageArchive.imageSrc;
          const imageSize = getArchiveImageSize(card);
          const imageSizes = getArchiveImageSizes(card);

          return (
            <figure
              className={`village-archive-card village-archive-card-${String(card.size || "medium").split("-")[0]}`}
              key={card.id}
              data-preview-target={`archive-${card.id}`}
              ref={(node) => { cardRefs.current[index] = node; }}
            >
              <div className="village-archive-media">
                <div className="village-archive-media-layer village-archive-media-layer-alt" aria-hidden="true">
                  <AdaptiveImage
                    src={altImage}
                    alt=""
                    colorVariant={alternateCard.colorVariant}
                    loading="lazy"
                    imagePosition={alternateCard.imagePosition || card.imagePosition}
                    imageVariant={imageSize}
                    sizes={imageSizes}
                  />
                </div>
                <div className="village-archive-media-layer village-archive-media-layer-front">
                  <AdaptiveImage
                    src={card.imageSrc || villageArchive.imageSrc}
                    alt={card.imageAlt}
                    colorVariant={card.colorVariant}
                    loading="lazy"
                    imagePosition={card.imagePosition}
                    imageVariant={imageSize}
                    sizes={imageSizes}
                  />
                </div>
              </div>

              <figcaption>
                <RevealLine direction={index % 2 === 0 ? "left" : "right"}>{card.label}</RevealLine>
                <strong><RevealLine direction={index % 2 === 0 ? "right" : "left"}>{card.year}</RevealLine></strong>
              </figcaption>
            </figure>
          );
        })}

        {/* Dynamic Add Card Slot */}
        <button
          className="village-archive-card archive-add-card-slot"
          type="button"
          onClick={openModal}
          aria-label="Thêm thẻ đoàn viên của bạn"
        >
          <div className="archive-add-card-inner">
            <div className="archive-add-icon-box">
              <YouthUnionPartyLogo size={36} />
            </div>
            <span className="archive-add-title">BẠN LÀ ĐOÀN VIÊN THÔN?</span>
            <span className="archive-add-desc">+ Thêm thẻ của bạn tại đây</span>
          </div>
        </button>
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
          onMouseDown={(event) => event.target === event.currentTarget && closeModal()}
        >
          <div
            className="youth-modal-card"
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
                      <label htmlFor="youth-age">Tuổi / năm sinh <b>*</b></label>
                      <input id="youth-age" ref={errors.age && !errors.name ? firstErrorRef : null} type="text" maxLength={30} inputMode="numeric" placeholder="Ví dụ: 21 tuổi" value={age} aria-invalid={Boolean(errors.age)} aria-describedby={errors.age ? "youth-age-error" : undefined} onChange={updateField(setAge, "age")} />
                      {errors.age && <span className="youth-field-error" id="youth-age-error">{errors.age}</span>}
                    </div>
                    <div className="youth-form-group youth-form-full">
                      <label htmlFor="youth-school">Trường học / nơi công tác <b>*</b></label>
                      <input id="youth-school" ref={errors.school && !errors.name && !errors.age ? firstErrorRef : null} type="text" maxLength={120} autoComplete="organization" placeholder="Ví dụ: Đại học Quốc gia Hà Nội • Bí thư Thôn 1" value={school} aria-invalid={Boolean(errors.school)} aria-describedby={errors.school ? "youth-school-error" : undefined} onChange={updateField(setSchool, "school")} />
                      {errors.school && <span className="youth-field-error" id="youth-school-error">{errors.school}</span>}
                    </div>
                  </div>
                </div>

                <div className="youth-modal-section">
                  <p className="youth-modal-section-title">ẢNH THẺ</p>
                  <div className="youth-form-group youth-form-full">
                    <label htmlFor="youth-image-src">Ảnh chính <b>*</b></label>
                    <span className="youth-field-hint">Dùng ảnh chân dung rõ mặt, dán đường dẫn hoặc chọn tệp tối đa 4 MB.</span>
                    <div className={`youth-image-input-box${errors.imageSrc ? " is-invalid" : ""}`}>
                      <input id="youth-image-src" type="url" placeholder="Dán link ảnh https://..." value={imageSrc} aria-invalid={Boolean(errors.imageSrc)} aria-describedby={errors.imageSrc ? "youth-image-error" : undefined} onChange={updateField(setImageSrc, "imageSrc")} />
                      <label className="youth-file-upload-btn">
                        <Upload className="youth-upload-icon" aria-hidden="true" />
                        <span>Chọn ảnh</span>
                        <input type="file" accept="image/*" onChange={(event) => handleFileChange(event, setImageSrc, "imageSrc")} hidden />
                      </label>
                    </div>
                    {imageSrc && !imageErrors.imageSrc && <div className="youth-img-preview-row"><img src={imageSrc} alt="Xem trước ảnh chính" className="youth-preview-thumb" onError={() => setImageErrors((current) => ({ ...current, imageSrc: true }))} /><span className="youth-preview-text">Đã chọn ảnh chính</span><button type="button" className="youth-preview-remove" onClick={() => { setImageSrc(""); setImageErrors((current) => ({ ...current, imageSrc: false })); }} aria-label="Xóa ảnh chính"><Trash2 aria-hidden="true" /></button></div>}
                    {errors.imageSrc && <span className="youth-field-error" id="youth-image-error">{errors.imageSrc}</span>}
                  </div>

                  <div className="youth-form-group youth-form-full">
                    <label htmlFor="youth-alt-image-src">Ảnh hover <span>(tùy chọn)</span></label>
                    <span className="youth-field-hint">Ảnh này xuất hiện khi rê chuột trên thẻ. Có thể bỏ trống.</span>
                    <div className={`youth-image-input-box${errors.altImageSrc ? " is-invalid" : ""}`}>
                      <input id="youth-alt-image-src" type="url" placeholder="Dán link ảnh phụ hoặc chọn tệp" value={altImageSrc} aria-invalid={Boolean(errors.altImageSrc)} aria-describedby={errors.altImageSrc ? "youth-alt-image-error" : undefined} onChange={updateField(setAltImageSrc, "altImageSrc")} />
                      <label className="youth-file-upload-btn">
                        <Upload className="youth-upload-icon" aria-hidden="true" />
                        <span>Chọn ảnh</span>
                        <input type="file" accept="image/*" onChange={(event) => handleFileChange(event, setAltImageSrc, "altImageSrc")} hidden />
                      </label>
                    </div>
                    {altImageSrc && !imageErrors.altImageSrc && <div className="youth-img-preview-row"><img src={altImageSrc} alt="Xem trước ảnh hover" className="youth-preview-thumb" onError={() => setImageErrors((current) => ({ ...current, altImageSrc: true }))} /><span className="youth-preview-text">Đã chọn ảnh hover</span><button type="button" className="youth-preview-remove" onClick={() => { setAltImageSrc(""); setImageErrors((current) => ({ ...current, altImageSrc: false })); }} aria-label="Xóa ảnh hover"><Trash2 aria-hidden="true" /></button></div>}
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
