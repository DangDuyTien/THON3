import { memo, useCallback, useRef, useState } from "react";
import { Plus, Upload, CheckCircle2, X } from "lucide-react";
import AdaptiveImage from "../AdaptiveImage.jsx";
import RevealLine from "../RevealLine.jsx";
import YouthUnionPartyLogo from "../icons/YouthUnionPartyLogo.jsx";
import { useSiteContent } from "../../content/SiteContentProvider.jsx";
import { useViewportEntryProgress } from "../../hooks/useMotion.js";
import { prewarmCmsImage } from "../../media.js";
import { addPendingSubmission } from "../../content/submission-store.js";

function getArchiveImageSize(card) {
  return card.size.includes("wide") || card.size.includes("feature") ? "medium" : "small";
}

function getArchiveImageSizes(card) {
  return card.size.includes("wide") ? "(max-width: 680px) 90vw, 50vw" : "(max-width: 680px) 44vw, 25vw";
}

export default memo(function VillageArchiveSection({ reducedMotion }) {
  const { content } = useSiteContent();
  const { villageArchive } = content;
  const sectionRef = useRef(null);
  const cardRefs = useRef([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  
  // Form State
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
      prewarmCmsImage(
        alternateCard.imageSrc || villageArchive.imageSrc,
        imageSize,
        imageSizes,
        alternateCard.colorVariant,
      );
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

  const handleFileChange = (e, setField) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setField(evt.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    addPendingSubmission({
      name: name.trim(),
      age: age.trim() || "Đoàn viên",
      school: school.trim() || "Thôn Mê Linh",
      imageSrc,
      altImageSrc,
    });

    setFormSubmitted(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setFormSubmitted(false);
      setName("");
      setAge("");
      setSchool("");
      setImageSrc("");
      setAltImageSrc("");
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
              className="village-archive-card"
              key={card.id}
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
          onClick={() => setIsModalOpen(true)}
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
          onClick={() => setIsModalOpen(true)}
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
        <div className="youth-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="youth-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="youth-modal-close" onClick={() => setIsModalOpen(false)} type="button" aria-label="Đóng">
              <X />
            </button>

            {formSubmitted ? (
              <div className="youth-modal-success">
                <CheckCircle2 className="youth-success-icon" />
                <h4>ĐÃ GỬI ĐĂNG KÝ THÀNH CÔNG!</h4>
                <p>Thông tin & ảnh của bạn đã được gửi tới Ban quản trị Admin xã Mê Linh. Sau khi Admin bấm <strong>[Đồng ý]</strong>, thẻ Đoàn viên của bạn sẽ ngay lập tức xuất hiện tại đây!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="youth-modal-form">
                <div className="youth-modal-header">
                  <span className="youth-modal-badge">
                    <YouthUnionPartyLogo size={20} style={{ marginRight: 6 }} /> ĐOÀN THANH NIÊN MÊ LINH
                  </span>
                  <h4>ĐĂNG KÝ THÊM THẺ ĐOÀN VIÊN</h4>
                  <p>Nhập thông tin cá nhân và tải lên 2 ảnh đại diện (ảnh chính & ảnh hover lướt sóng).</p>
                </div>

                <div className="youth-form-grid">
                  <div className="youth-form-group">
                    <label htmlFor="youth-name">Họ và Tên đoàn viên *</label>
                    <input
                      id="youth-name"
                      type="text"
                      required
                      placeholder="Ví dụ: Nguyễn Văn An"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="youth-form-group">
                    <label htmlFor="youth-age">Tuổi / Năm sinh *</label>
                    <input
                      id="youth-age"
                      type="text"
                      required
                      placeholder="Ví dụ: 21 tuổi"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                  </div>

                  <div className="youth-form-group youth-form-full">
                    <label htmlFor="youth-school">Học trường nào / Nơi công tác *</label>
                    <input
                      id="youth-school"
                      type="text"
                      required
                      placeholder="Ví dụ: Đại học Quốc gia Hà Nội • Bí thư Thôn 1"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                    />
                  </div>

                  {/* Image 1: Main Photo */}
                  <div className="youth-form-group youth-form-full">
                    <label>Ảnh đại diện chính (Ảnh 1) *</label>
                    <div className="youth-image-input-box">
                      <input
                        type="url"
                        placeholder="Dán link ảnh (https://...) hoặc tải ảnh bên dưới"
                        value={imageSrc}
                        onChange={(e) => setImageSrc(e.target.value)}
                      />
                      <label className="youth-file-upload-btn">
                        <Upload className="youth-upload-icon" />
                        <span>Tải ảnh lên</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, setImageSrc)}
                          hidden
                        />
                      </label>
                    </div>
                    {imageSrc && (
                      <div className="youth-img-preview-row">
                        <img src={imageSrc} alt="Preview ảnh 1" className="youth-preview-thumb" />
                        <span className="youth-preview-text">Đã chọn ảnh chính</span>
                      </div>
                    )}
                  </div>

                  {/* Image 2: Alternate Hover Wave Image */}
                  <div className="youth-form-group youth-form-full">
                    <label>Ảnh 2 xuất hiện khi di chuột lướt sóng (Hover Image)</label>
                    <div className="youth-image-input-box">
                      <input
                        type="url"
                        placeholder="Dán link ảnh thứ 2 hoặc tải ảnh từ máy"
                        value={altImageSrc}
                        onChange={(e) => setAltImageSrc(e.target.value)}
                      />
                      <label className="youth-file-upload-btn">
                        <Upload className="youth-upload-icon" />
                        <span>Tải ảnh thứ 2</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, setAltImageSrc)}
                          hidden
                        />
                      </label>
                    </div>
                    {altImageSrc && (
                      <div className="youth-img-preview-row">
                        <img src={altImageSrc} alt="Preview ảnh 2" className="youth-preview-thumb" />
                        <span className="youth-preview-text">Đã chọn ảnh lướt sóng (Hover)</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="youth-modal-actions">
                  <button type="button" className="youth-btn-cancel" onClick={() => setIsModalOpen(false)}>
                    Hủy bỏ
                  </button>
                  <button type="submit" className="youth-btn-submit">
                    GỬI ĐĂNG KÝ CHO ADMIN DUYỆT
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
});
