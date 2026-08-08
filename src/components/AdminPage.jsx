import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  PanelTopClose,
  PanelTopOpen,
  Download,
  Eye,
  FileJson,
  ImagePlus,
  LogOut,
  RotateCcw,
  Save,
  Search,
  Settings,
  Trash2,
  Upload,
  Waves,
  X,
} from "lucide-react";
import AdminLivePreview from "./admin/AdminLivePreview.jsx";
import AdminImageEditor from "./admin/AdminImageEditor.jsx";
import {
  clearSiteContentDraft,
  cloneDefaultSiteContent,
  loadSiteContentDraft,
  normalizeSiteContent,
  persistSiteContentDraft,
} from "../content/content-store.js";
import { getDraftContent, saveDraftContent, deleteDraftContent } from "../lib/content-api.js";
import { getSession } from "../lib/auth-api.js";
import { isSupabaseConfigured } from "../lib/supabase.js";
import { useSiteContent } from "../content/SiteContentProvider.jsx";
import { getPendingSubmissions, rejectPendingSubmission } from "../content/submission-store.js";
import {
  SITE_APPEARANCE_OPTIONS,
  SITE_FONT_OPTIONS,
} from "../content/site-theme.js";
import {
  ADMIN_NAV_ITEMS,
  ADMIN_SECTIONS,
  getAdminSectionFromHash,
  getAdminHash,
  getAdminPublicTarget,
  getPublicHomeHref,
} from "./admin/admin-registry.js";

const AdminCardCommandContext = createContext(null);
const AdminImageTargetContext = createContext(null);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function setAtPath(source, path, value) {
  const next = clone(source);
  const segments = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let target = next;

  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      target[segment] = value;
      return;
    }
    target = target[segment];
  });

  return next;
}

function fieldId(label) {
  return `admin-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function AdminField({ label, value, onChange, multiline = false, hint, type = "text", placeholder }) {
  const generatedId = useId();
  const id = `admin-field-${generatedId.replace(/:/g, "")}`;
  return (
    <label className="admin-field" htmlFor={id}>
      <span className="admin-field-label">{label}</span>
      {multiline ? (
        <textarea
          id={id}
          rows={4}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      )}
      {hint && <span className="admin-field-hint">{hint}</span>}
    </label>
  );
}

function AdminSelectField({ label, value, onChange, options, hint }) {
  const generatedId = useId();
  const id = `admin-select-${generatedId.replace(/:/g, "")}`;
  return (
    <label className="admin-field admin-select-field" htmlFor={id}>
      <span className="admin-field-label">{label}</span>
      <select id={id} value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
      </select>
      {hint && <span className="admin-field-hint">{hint}</span>}
    </label>
  );
}

function AdminColorField({ label, value, onChange, hint, fallback = "#15271f" }) {
  const generatedId = useId();
  const id = `admin-color-${generatedId.replace(/:/g, "")}`;
  const colorValue = /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  return (
    <label className="admin-color-field" htmlFor={id}>
      <span className="admin-field-label">{label}</span>
      <span className="admin-color-control">
        <input
          className="admin-color-swatch"
          type="color"
          value={colorValue}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`Chọn ${label.toLowerCase()}`}
        />
        <input
          id={id}
          className="admin-color-value"
          type="text"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          spellCheck="false"
          inputMode="text"
          aria-label={`${label} - mã màu`}
        />
      </span>
      {hint && <span className="admin-field-hint">{hint}</span>}
    </label>
  );
}

function AdminImageField({ label, value, onChange, hint, alt, onAltChange, position, onPositionChange, fallbackSrc, fit, target }) {
  const onTarget = useContext(AdminImageTargetContext);
  return (
    <AdminImageEditor
      label={label}
      value={value}
      onChange={onChange}
      hint={hint}
      alt={alt}
      onAltChange={onAltChange}
      position={position}
      onPositionChange={onPositionChange}
      fallbackSrc={fallbackSrc}
      fit={fit}
      target={target}
      onTarget={onTarget}
    />
  );
}

function AdminCardTools({ count }) {
  const cardCommand = useContext(AdminCardCommandContext);

  if (!cardCommand || !count) return null;

  return (
    <div className="admin-card-tools" aria-label="Điều khiển các mục">
      <span>{count} mục</span>
      <button className="admin-card-tool-button" type="button" onClick={() => cardCommand.issue("expand")} title="Mở tất cả mục">
        <PanelTopOpen aria-hidden="true" />
        <span>Mở tất cả</span>
      </button>
      <button className="admin-card-tool-button" type="button" onClick={() => cardCommand.issue("collapse")} title="Thu gọn tất cả mục">
        <PanelTopClose aria-hidden="true" />
        <span>Thu gọn</span>
      </button>
    </div>
  );
}

function AdminPanel({ eyebrow, title, description, cardCount = 0, children }) {
  return (
    <section className="admin-panel" aria-labelledby={fieldId(title)}>
      <div className="admin-panel-heading">
        <div>
          {eyebrow && <p className="admin-panel-eyebrow">{eyebrow}</p>}
          <h2 id={fieldId(title)}>{title}</h2>
        </div>
        <div className="admin-panel-heading-side">
          {description && <p className="admin-panel-description">{description}</p>}
          <AdminCardTools count={cardCount} />
        </div>
      </div>
      <div className="admin-panel-body">{children}</div>
    </section>
  );
}

function getAppearanceChoiceLabel(group, value) {
  const option = SITE_APPEARANCE_OPTIONS[group]?.find((item) => item.value === value);
  return option?.label?.replace(/\s*\(.*/, "") || value;
}

function AdminCard({ title, index, children, openByDefault = index === 0 }) {
  const cardCommand = useContext(AdminCardCommandContext);
  const [open, setOpen] = useState(openByDefault);
  const handledCommandRef = useRef(0);

  useEffect(() => {
    if (!cardCommand || handledCommandRef.current === cardCommand.version) return;
    handledCommandRef.current = cardCommand.version;
    setOpen(cardCommand.action === "expand");
  }, [cardCommand?.action, cardCommand?.version]);

  return (
    <details className="admin-card" open={open}>
      <summary className="admin-card-heading" onClick={(event) => {
        event.preventDefault();
        setOpen((current) => !current);
      }}>
        <span className="admin-card-heading-copy">
          <span className="admin-card-index">{String(index + 1).padStart(2, "0")}</span>
          <span className="admin-card-title">{title}</span>
        </span>
        <ChevronDown aria-hidden="true" />
      </summary>
      <div className="admin-card-body">{children}</div>
    </details>
  );
}

function SettingsEditor({ draft, update }) {
  const appearance = draft.settings.appearance;
  return (
    <AdminPanel eyebrow="01 / HỆ THỐNG" title="Nhận diện & giao diện" description="Từ chữ, màu, nền đến nhịp chuyển động của trang chủ đều có thể điều chỉnh ở đây.">
      <div className="admin-settings-section">
        <div className="admin-settings-section-heading">
          <span>01</span>
          <div>
            <h3>Thông tin hiển thị</h3>
            <p>Những dòng chữ xuất hiện ở đầu và cuối trang chủ.</p>
          </div>
        </div>
        <div className="admin-form-grid">
          <AdminField label="Tên địa danh" value={draft.settings.siteName} onChange={(value) => update("settings.siteName", value)} />
          <AdminField label="Dòng giới thiệu ngắn" value={draft.settings.tagline} onChange={(value) => update("settings.tagline", value)} />
          <AdminField label="Thông điệp chân trang" value={draft.settings.footerText} onChange={(value) => update("settings.footerText", value)} />
          <AdminField label="Nhãn vị trí bên trái" value={draft.settings.coordinates[0]} onChange={(value) => update("settings.coordinates[0]", value)} />
          <AdminField label="Nhãn vị trí bên phải" value={draft.settings.coordinates[1]} onChange={(value) => update("settings.coordinates[1]", value)} />
        </div>
      </div>

      <div className="admin-settings-section">
        <div className="admin-settings-section-heading">
          <span>02</span>
          <div>
            <h3>Phông chữ</h3>
            <p>Chọn riêng chữ tiêu đề, chữ nội dung và nhãn kỹ thuật.</p>
          </div>
        </div>
        <div className="admin-form-grid admin-form-grid-three">
          <AdminSelectField label="Font tiêu đề" value={appearance.fonts.display} onChange={(value) => update("settings.appearance.fonts.display", value)} options={SITE_FONT_OPTIONS.display} />
          <AdminSelectField label="Font nội dung" value={appearance.fonts.sans} onChange={(value) => update("settings.appearance.fonts.sans", value)} options={SITE_FONT_OPTIONS.sans} />
          <AdminSelectField label="Font nhãn kỹ thuật" value={appearance.fonts.mono} onChange={(value) => update("settings.appearance.fonts.mono", value)} options={SITE_FONT_OPTIONS.mono} />
        </div>
      </div>

      <div className="admin-settings-section">
        <div className="admin-settings-section-heading">
          <span>03</span>
          <div>
            <h3>Màu sắc & nền</h3>
            <p>Nhập mã HEX hoặc bấm vào ô màu để chọn trực tiếp.</p>
          </div>
        </div>
        <div className="admin-color-grid">
          <AdminColorField label="Màu nền ngoài" value={appearance.colors.background} onChange={(value) => update("settings.appearance.colors.background", value)} fallback="#edf0e8" />
          <AdminColorField label="Nền sáng" value={appearance.colors.paper} onChange={(value) => update("settings.appearance.colors.paper", value)} fallback="#f5f6ef" />
          <AdminColorField label="Nền sáng đậm" value={appearance.colors.paperDeep} onChange={(value) => update("settings.appearance.colors.paperDeep", value)} fallback="#e5e9dc" />
          <AdminColorField label="Màu chữ & nền tối" value={appearance.colors.ink} onChange={(value) => update("settings.appearance.colors.ink", value)} fallback="#15271f" />
          <AdminColorField label="Màu chữ phụ" value={appearance.colors.inkSoft} onChange={(value) => update("settings.appearance.colors.inkSoft", value)} fallback="#294337" />
          <AdminColorField label="Màu nhấn" value={appearance.colors.lime} onChange={(value) => update("settings.appearance.colors.lime", value)} fallback="#d2ff00" />
          <AdminColorField label="Màu xanh nước" value={appearance.colors.lake} onChange={(value) => update("settings.appearance.colors.lake", value)} fallback="#82c6c0" />
        </div>
      </div>

      <div className="admin-settings-section">
        <div className="admin-settings-section-heading">
          <span>04</span>
          <div>
            <h3>Bố cục</h3>
            <p>Điều chỉnh độ thoáng, độ rộng khung và cảm giác bo góc.</p>
          </div>
        </div>
        <div className="admin-form-grid admin-form-grid-three">
          <AdminSelectField label="Mật độ trang" value={appearance.layout.density} onChange={(value) => update("settings.appearance.layout.density", value)} options={SITE_APPEARANCE_OPTIONS.density} />
          <AdminSelectField label="Khung nội dung" value={appearance.layout.frame} onChange={(value) => update("settings.appearance.layout.frame", value)} options={SITE_APPEARANCE_OPTIONS.frame} />
          <AdminSelectField label="Kiểu góc" value={appearance.layout.radius} onChange={(value) => update("settings.appearance.layout.radius", value)} options={SITE_APPEARANCE_OPTIONS.radius} />
        </div>
      </div>

      <div className="admin-settings-section">
        <div className="admin-settings-section-heading">
          <span>05</span>
          <div>
            <h3>Hiệu ứng</h3>
            <p>Chọn mức chuyển động, xử lý ảnh và tương tác khi rê chuột.</p>
          </div>
        </div>
        <div className="admin-form-grid admin-form-grid-three">
          <AdminSelectField label="Chuyển động" value={appearance.effects.motion} onChange={(value) => update("settings.appearance.effects.motion", value)} options={SITE_APPEARANCE_OPTIONS.motion} />
          <AdminSelectField label="Xử lý ảnh" value={appearance.effects.imageTreatment} onChange={(value) => update("settings.appearance.effects.imageTreatment", value)} options={SITE_APPEARANCE_OPTIONS.imageTreatment} />
          <AdminSelectField label="Hiệu ứng rê chuột" value={appearance.effects.hover} onChange={(value) => update("settings.appearance.effects.hover", value)} options={SITE_APPEARANCE_OPTIONS.hover} />
        </div>
        <p className="admin-settings-callout"><Waves aria-hidden="true" /> Preview phía trên dùng chính các lựa chọn này. Hãy thử đổi từng nhóm rồi bấm “Lưu thay đổi” khi đã ưng ý.</p>
      </div>
    </AdminPanel>
  );
}

function HeroEditor({ draft, update }) {
  return (
    <AdminPanel eyebrow="02 / MỞ ĐẦU" title="Bốn khung cảnh mở đầu" description="Mỗi khung cảnh xuất hiện khi người xem cuộn qua phần đầu trang." cardCount={draft.storyFrames.length}>
      <div className="admin-card-stack">
        {draft.storyFrames.map((frame, index) => (
          <AdminCard key={frame.number} index={index} title={`Khung cảnh ${frame.number}`}>
            <div className="admin-form-grid admin-form-grid-wide">
              <AdminField label="Nhãn nhỏ" value={frame.eyebrow} onChange={(value) => update(`storyFrames[${index}].eyebrow`, value)} />
              <AdminField label="Dòng chính" value={frame.lead} onChange={(value) => update(`storyFrames[${index}].lead`, value)} />
              <AdminField label="Dòng nhấn" value={frame.accent} onChange={(value) => update(`storyFrames[${index}].accent`, value)} />
              <AdminField label="Ghi chú bên phải" value={frame.note} onChange={(value) => update(`storyFrames[${index}].note`, value)} />
              <AdminField label="Mô tả" multiline value={frame.description} onChange={(value) => update(`storyFrames[${index}].description`, value)} />
              <AdminImageField
                label="Ảnh khung cảnh"
                value={frame.imageSrc}
                onChange={(value) => update(`storyFrames[${index}].imageSrc`, value)}
                alt={frame.description}
                onAltChange={(value) => update(`storyFrames[${index}].description`, value)}
                position={frame.position}
                onPositionChange={(value) => update(`storyFrames[${index}].position`, value)}
                target={`hero-${index}`}
                hint={index === 0 ? "Khung 01 là ảnh đang hiển thị trên trang chủ." : "Khung này đang được lưu trong nội dung nhưng chưa xuất hiện ở Hero hiện tại."}
              />
            </div>
          </AdminCard>
        ))}
      </div>
    </AdminPanel>
  );
}

function StoryEditor({ draft, update }) {
  const message = draft.villageMessage;
  return (
    <AdminPanel eyebrow="03 / CÂU CHUYỆN" title="Lời nhắn từ Mê Linh" description="Nội dung và hình ảnh của phần câu chuyện chính.">
      <div className="admin-form-grid">
        <AdminField label="Nhãn nhỏ" value={message.eyebrow} onChange={(value) => update("villageMessage.eyebrow", value)} />
        <AdminField label="Dòng tiêu đề phía trên" value={message.headlineTop} onChange={(value) => update("villageMessage.headlineTop", value)} />
        <AdminField label="Dòng tiêu đề phía dưới" value={message.headlineBottom} onChange={(value) => update("villageMessage.headlineBottom", value)} />
        <AdminField label="Chữ ký" value={message.signatureText} onChange={(value) => update("villageMessage.signatureText", value)} />
        <AdminField label="Tóm tắt" multiline value={message.summary} onChange={(value) => update("villageMessage.summary", value)} />
        <AdminImageField
          label="Ảnh câu chuyện"
          value={message.imageSrc}
          onChange={(value) => update("villageMessage.imageSrc", value)}
          alt={message.imageAlt}
          onAltChange={(value) => update("villageMessage.imageAlt", value)}
          position={message.imagePosition}
          onPositionChange={(value) => update("villageMessage.imagePosition", value)}
          target="story-main"
        />
        <AdminImageField
          label="Ảnh chữ ký (không bắt buộc)"
          value={message.signatureImage || ""}
          onChange={(value) => update("villageMessage.signatureImage", value || null)}
          alt={message.signatureAlt}
          onAltChange={(value) => update("villageMessage.signatureAlt", value)}
          fit="contain"
          target="story-signature"
          hint="Để trống để dùng chữ ký vẽ từ trường Chữ ký."
        />
      </div>
    </AdminPanel>
  );
}

function ClosingEditor({ draft, update }) {
  const closing = draft.closing;
  const arrival = draft.fullBleedArrival;
  const updateRow = (group, index, key, value) => update(`closing.${group}[${index}].${key}`, value);
  return (
    <AdminPanel eyebrow="10 / THEO DÕI MÊ LINH" title="Phần kết, liên kết và kênh theo dõi" description="Chỉnh nội dung hiển thị ở cuối trang, các liên kết tổng hợp và kênh mạng xã hội.">
      <div className="admin-form-grid">
        <AdminField label="Nhãn chuyển cảnh" value={closing.transitionKicker} onChange={(value) => update("closing.transitionKicker", value)} />
        <AdminField label="Tiêu đề chuyển cảnh" value={closing.transitionTitle} onChange={(value) => update("closing.transitionTitle", value)} />
        <AdminField label="Nhãn nút ghé thăm" value={closing.visitLabel} onChange={(value) => update("closing.visitLabel", value)} />
        <AdminField label="Nhãn cột điều hướng" value={closing.navLabel} onChange={(value) => update("closing.navLabel", value)} />
        <AdminField label="Nhãn cột theo dõi" value={closing.networkLabel} onChange={(value) => update("closing.networkLabel", value)} />
        <AdminField label="Nhãn liên hệ" value={closing.contactLabel} onChange={(value) => update("closing.contactLabel", value)} />
        <AdminField label="Liên kết liên hệ" value={closing.contactHref} onChange={(value) => update("closing.contactHref", value)} hint="Ví dụ: #dong-hanh hoặc https://…" />
        <AdminField label="Dòng thiết kế" value={closing.designCredit} onChange={(value) => update("closing.designCredit", value)} />
        <AdminField label="Bản quyền" value={closing.copyrightTemplate} onChange={(value) => update("closing.copyrightTemplate", value)} hint="Dùng {siteName} để chèn tên trang." />
      </div>
      <div className="admin-divider" />
      <div className="admin-form-grid">
        <AdminField label="Tiêu đề closing — dòng 1" value={arrival.headline[0]} onChange={(value) => update("fullBleedArrival.headline[0]", value)} />
        <AdminField label="Tiêu đề closing — dòng 2" value={arrival.headline[1]} onChange={(value) => update("fullBleedArrival.headline[1]", value)} />
        <AdminImageField label="Ảnh chân dung closing" value={arrival.portraitSrc || ""} onChange={(value) => update("fullBleedArrival.portraitSrc", value)} alt={arrival.portraitAlt} onAltChange={(value) => update("fullBleedArrival.portraitAlt", value)} position={arrival.imagePosition} onPositionChange={(value) => update("fullBleedArrival.imagePosition", value)} target="closing-portrait" hint="Để trống để dùng ảnh toàn cảnh của phần Hai lối trở về." />
      </div>
      <div className="admin-card-stack admin-card-stack-compact">
        <AdminCard title="Mạng xã hội" index={0}>
          <div className="admin-card-stack admin-card-stack-compact">{closing.socialItems.map((item, index) => <div className="admin-form-grid admin-form-grid-wide" key={item.id || index}><AdminField label="Tên kênh" value={item.label} onChange={(value) => updateRow("socialItems", index, "label", value)} /><AdminField label="Liên kết" value={item.href} onChange={(value) => updateRow("socialItems", index, "href", value)} /></div>)}</div>
        </AdminCard>
        <AdminCard title="Điều hướng trang" index={1}>
          <div className="admin-card-stack admin-card-stack-compact">{closing.navItems.map((item, index) => <div className="admin-form-grid admin-form-grid-wide" key={item.id || index}><AdminField label="Nhãn" value={item.label} onChange={(value) => updateRow("navItems", index, "label", value)} /><AdminField label="Anchor / URL" value={item.href} onChange={(value) => updateRow("navItems", index, "href", value)} /></div>)}</div>
        </AdminCard>
        <AdminCard title="Mạng lưới liên kết" index={2}>
          <div className="admin-card-stack admin-card-stack-compact">{closing.networkItems.map((item, index) => <div className="admin-form-grid admin-form-grid-wide" key={item.id || index}><AdminField label="Nhãn" value={item.label} onChange={(value) => updateRow("networkItems", index, "label", value)} /><AdminField label="Anchor / URL" value={item.href} onChange={(value) => updateRow("networkItems", index, "href", value)} /></div>)}</div>
        </AdminCard>
      </div>
    </AdminPanel>
  );
}

function StatementEditor({ draft, update }) {
  return (
    <AdminPanel eyebrow="04 / TUYÊN NGÔN" title="Thông điệp giữa trang" description="Bốn dòng chữ lớn tạo nhịp chuyển tiếp cho trang chủ." cardCount={draft.exploreStatement.lines.length}>
      <div className="admin-form-grid">
        <AdminField label="Nhãn nhỏ" value={draft.exploreStatement.eyebrow} onChange={(value) => update("exploreStatement.eyebrow", value)} />
      </div>
      <div className="admin-card-stack admin-card-stack-compact">
        {draft.exploreStatement.lines.map((line, index) => (
          <AdminCard key={`line-${index}`} index={index} title={`Dòng ${index + 1}`}>
            <div className="admin-form-grid admin-form-grid-three">
              <AdminField label="Chữ trước" value={line.before} onChange={(value) => update(`exploreStatement.lines[${index}].before`, value)} />
              <AdminField label="Chữ nhấn" value={line.accent} onChange={(value) => update(`exploreStatement.lines[${index}].accent`, value)} />
              <AdminField label="Chữ sau" value={line.after} onChange={(value) => update(`exploreStatement.lines[${index}].after`, value)} />
            </div>
          </AdminCard>
        ))}
      </div>
    </AdminPanel>
  );
}

function SeasonsEditor({ draft, update }) {
  const gallery = draft.seasonalGallery;
  return (
    <AdminPanel eyebrow="05 / NHỊP SỐNG" title="Bộ ảnh theo mùa" description="Thay lời dẫn, chữ ký và từng ảnh trong dải chuyển động." cardCount={gallery.photos.length}>
      <div className="admin-form-grid">
        <AdminField label="Nhãn nhỏ" value={gallery.eyebrow} onChange={(value) => update("seasonalGallery.eyebrow", value)} />
        <AdminField label="Chữ ký" value={gallery.signature} onChange={(value) => update("seasonalGallery.signature", value)} />
        <AdminField label="Lời dẫn" multiline value={gallery.quote} onChange={(value) => update("seasonalGallery.quote", value)} />
      </div>
      <div className="admin-card-stack">
        {gallery.photos.map((photo, index) => (
          <AdminCard key={photo.id} index={index} title={photo.label || `Ảnh ${index + 1}`}>
            <div className="admin-form-grid admin-form-grid-wide">
              <AdminField label="Tên ảnh" value={photo.label} onChange={(value) => update(`seasonalGallery.photos[${index}].label`, value)} />
              <AdminImageField
                label="Ảnh"
                value={photo.imageSrc}
                onChange={(value) => update(`seasonalGallery.photos[${index}].imageSrc`, value)}
                alt={photo.imageAlt}
                onAltChange={(value) => update(`seasonalGallery.photos[${index}].imageAlt`, value)}
                position={photo.imagePosition}
                onPositionChange={(value) => update(`seasonalGallery.photos[${index}].imagePosition`, value)}
                target={`seasons-${photo.id}`}
              />
            </div>
          </AdminCard>
        ))}
      </div>
    </AdminPanel>
  );
}

function ChoiceEditor({ choice, path, update, index }) {
  return (
    <AdminCard index={index} title={index === 0 ? "Lối vào câu chuyện" : "Lối khám phá nhịp sống"}>
      <div className="admin-form-grid admin-form-grid-wide">
        <AdminField label="Nhãn nhỏ" value={choice.kicker} onChange={(value) => update(`${path}.kicker`, value)} />
        <AdminField label="Dòng trên" value={choice.upper} onChange={(value) => update(`${path}.upper`, value)} />
        <AdminField label="Dòng nhấn" value={choice.lower} onChange={(value) => update(`${path}.lower`, value)} />
        <AdminField label="Nút dẫn tới" value={choice.actionLabel} onChange={(value) => update(`${path}.actionLabel`, value)} />
        <AdminField label="Liên kết" value={choice.href} onChange={(value) => update(`${path}.href`, value)} hint="Ví dụ: #cau-chuyen" />
        <AdminField label="Mô tả" multiline value={choice.copy} onChange={(value) => update(`${path}.copy`, value)} />
        <AdminImageField
          label="Ảnh lựa chọn"
          value={choice.imageSrc}
          onChange={(value) => update(`${path}.imageSrc`, value)}
          alt={choice.imageAlt}
          onAltChange={(value) => update(`${path}.imageAlt`, value)}
          position={choice.imagePosition}
          onPositionChange={(value) => update(`${path}.imagePosition`, value)}
          target={`visit-${index}`}
        />
      </div>
    </AdminCard>
  );
}

function VisitEditor({ draft, update }) {
  return (
    <AdminPanel eyebrow="06 / GHÉ THĂM" title="Hai lối trở về" description="Hai lựa chọn nội dung cùng hình ảnh toàn màn hình ở cuối phần này." cardCount={2}>
      <div className="admin-form-grid">
        <AdminField label="Chú thích chung" value={draft.visitChoices.caption} onChange={(value) => update("visitChoices.caption", value)} />
      </div>
      <div className="admin-card-stack">
        <ChoiceEditor choice={draft.visitChoices.left} path="visitChoices.left" update={update} index={0} />
        <ChoiceEditor choice={draft.visitChoices.right} path="visitChoices.right" update={update} index={1} />
      </div>
      <div className="admin-divider" />
      <div className="admin-form-grid">
        <AdminImageField
          label="Ảnh toàn cảnh"
          value={draft.fullBleedArrival.imageSrc}
          onChange={(value) => update("fullBleedArrival.imageSrc", value)}
          alt={draft.fullBleedArrival.imageAlt}
          onAltChange={(value) => update("fullBleedArrival.imageAlt", value)}
          position={draft.fullBleedArrival.imagePosition}
          onPositionChange={(value) => update("fullBleedArrival.imagePosition", value)}
          target="visit-arrival"
        />
      </div>
    </AdminPanel>
  );
}

function PendingYouthUnionApproval({ draft, update }) {
  const [pendingList, setPendingList] = useState(getPendingSubmissions);

  useEffect(() => {
    const handleStorage = () => setPendingList(getPendingSubmissions());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleApprove = (item) => {
    const newCard = {
      colorVariant: "archive-default",
      id: `member-${Date.now()}`,
      label: item.name,
      year: `${item.age} • ${item.school}`,
      imageAlt: `Đoàn viên ${item.name}`,
      imagePosition: "center 30%",
      imageSrc: item.imageSrc || "",
      altImageSrc: item.altImageSrc || "",
      size: "medium",
    };
    
    const updatedCards = [...draft.villageArchive.cards, newCard];
    update("villageArchive.cards", updatedCards);
    
    const remaining = rejectPendingSubmission(item.id);
    setPendingList(remaining);
  };

  const handleReject = (id) => {
    const remaining = rejectPendingSubmission(id);
    setPendingList(remaining);
  };

  if (!pendingList.length) return null;

  return (
    <div className="admin-pending-approval-box">
      <div className="admin-pending-header">
        <span className="admin-pending-badge">{pendingList.length} YÊU CẦU ĐANG CHỜ DUYỆT</span>
        <h4>Duyệt thẻ Đoàn viên đăng ký mới</h4>
        <p>Đoàn viên vừa gửi đăng ký từ website. Bấm <strong>[✓ Đồng ý]</strong> để thẻ lập tức được thêm vào trang chủ.</p>
      </div>

      <div className="admin-pending-list">
        {pendingList.map((item) => (
          <div className="admin-pending-item" key={item.id}>
            <div className="admin-pending-thumbs">
              <div className="admin-pending-thumb">
                {item.imageSrc ? (
                  <img src={item.imageSrc} alt={item.name} />
                ) : (
                  <div className="admin-no-img">Không có ảnh</div>
                )}
                <span>Ảnh 1 (Chính)</span>
              </div>
              {item.altImageSrc && (
                <div className="admin-pending-thumb">
                  <img src={item.altImageSrc} alt={`${item.name} hover`} />
                  <span>Ảnh 2 (Hover)</span>
                </div>
              )}
            </div>

            <div className="admin-pending-info">
              <h5>{item.name}</h5>
              <p><strong>Tuổi:</strong> {item.age}</p>
              <p><strong>Trường học / Đơn vị:</strong> {item.school}</p>
              <span className="admin-pending-date">Ngày đăng ký: {item.submittedAt}</span>
            </div>

            <div className="admin-pending-actions">
              <button
                className="admin-btn-approve"
                type="button"
                onClick={() => handleApprove(item)}
              >
                ✓ ĐỒNG Ý PHÊ DUYỆT
              </button>
              <button
                className="admin-btn-reject"
                type="button"
                onClick={() => handleReject(item.id)}
              >
                ✕ TỪ CHỐI
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArchiveEditor({ draft, update }) {
  const archive = draft.villageArchive;
  return (
    <AdminPanel eyebrow="07 / TƯ LIỆU" title="Lưới ảnh lưu trữ" description="Thay tiêu đề, năm, mô tả và ảnh cho từng lát cắt của làng." cardCount={archive.cards.length}>
      <PendingYouthUnionApproval draft={draft} update={update} />
      <div className="admin-form-grid">
        <AdminField label="Nhãn nhỏ" value={archive.eyebrow} onChange={(value) => update("villageArchive.eyebrow", value)} />
        <AdminField label="Tiêu đề" multiline value={archive.title} onChange={(value) => update("villageArchive.title", value)} hint="Dùng xuống dòng để tách hai dòng lớn." />
        <AdminImageField
          label="Ảnh mặc định"
          value={archive.imageSrc}
          onChange={(value) => update("villageArchive.imageSrc", value)}
          fallbackSrc="/assets/village-hero.jpg"
          target="archive-default"
          hint="Dùng làm ảnh dự phòng nếu một thẻ chưa có ảnh riêng."
        />
      </div>
      <div className="admin-card-stack">
        {archive.cards.map((card, index) => (
          <AdminCard key={card.id} index={index} title={card.label || `Tư liệu ${index + 1}`}>
            <div className="admin-form-grid admin-form-grid-wide">
              <AdminField label="Tên tư liệu" value={card.label} onChange={(value) => update(`villageArchive.cards[${index}].label`, value)} />
              <AdminField label="Năm" value={card.year} onChange={(value) => update(`villageArchive.cards[${index}].year`, value)} />
              <AdminImageField
                label="Ảnh tư liệu"
                value={card.imageSrc || ""}
                fallbackSrc={archive.imageSrc}
                onChange={(value) => update(`villageArchive.cards[${index}].imageSrc`, value)}
                alt={card.imageAlt}
                onAltChange={(value) => update(`villageArchive.cards[${index}].imageAlt`, value)}
                position={card.imagePosition}
                onPositionChange={(value) => update(`villageArchive.cards[${index}].imagePosition`, value)}
                target={`archive-${card.id}`}
              />
              <AdminImageField
                label="Ảnh khi rê chuột (không bắt buộc)"
                value={card.altImageSrc || ""}
                onChange={(value) => update(`villageArchive.cards[${index}].altImageSrc`, value)}
                position={card.imagePosition}
                onPositionChange={(value) => update(`villageArchive.cards[${index}].imagePosition`, value)}
                target={`archive-${card.id}`}
              />
            </div>
          </AdminCard>
        ))}
      </div>
    </AdminPanel>
  );
}

function CommunityEditor({ draft, update }) {
  const partners = draft.communityPartners;
  return (
    <AdminPanel eyebrow="08 / CỘNG ĐỒNG" title="Đơn vị đồng hành" description="Cập nhật lời giới thiệu, tiêu đề và nhận diện của các tổ chức." cardCount={partners.organizations.length}>
      <div className="admin-form-grid">
        <AdminField label="Nhãn nhỏ" value={partners.eyebrow} onChange={(value) => update("communityPartners.eyebrow", value)} />
        <AdminField label="Lời giới thiệu" multiline value={partners.copy} onChange={(value) => update("communityPartners.copy", value)} />
        <AdminField label="Dòng tiêu đề 1" value={partners.headline[0]} onChange={(value) => update("communityPartners.headline[0]", value)} />
        <AdminField label="Dòng tiêu đề 2" value={partners.headline[1]} onChange={(value) => update("communityPartners.headline[1]", value)} />
      </div>
      <div className="admin-card-stack">
        {partners.organizations.map((organization, index) => (
          <AdminCard key={organization.id} index={index} title={organization.label || `Đơn vị ${index + 1}`}>
            <div className="admin-form-grid admin-form-grid-wide">
              <AdminField label="Tên đơn vị" value={organization.label} onChange={(value) => update(`communityPartners.organizations[${index}].label`, value)} />
              <AdminField label="Ký hiệu chữ" value={organization.mark} onChange={(value) => update(`communityPartners.organizations[${index}].mark`, value)} hint="Hiển thị khi không có logo." />
              <AdminImageField
                label="Logo"
                value={organization.logo}
                onChange={(value) => update(`communityPartners.organizations[${index}].logo`, value)}
                alt={organization.logoAlt}
                onAltChange={(value) => update(`communityPartners.organizations[${index}].logoAlt`, value)}
                fit="contain"
                target={`community-${organization.id}`}
              />
            </div>
          </AdminCard>
        ))}
      </div>
    </AdminPanel>
  );
}

function UpdatesEditor({ draft, update }) {
  const updates = draft.villageUpdates;
  return (
    <AdminPanel eyebrow="09 / NHỊP SỐNG HÔM NAY" title="Các hoạt động đang diễn ra" description="Nội dung các thẻ hoạt động xuất hiện ở phần cuối trang chủ." cardCount={updates.cards.length}>
      <div className="admin-form-grid">
        <AdminField label="Nhãn nhỏ" value={updates.eyebrow} onChange={(value) => update("villageUpdates.eyebrow", value)} />
        <AdminField label="Dòng tiêu đề 1" value={updates.headline[0]} onChange={(value) => update("villageUpdates.headline[0]", value)} />
        <AdminField label="Dòng tiêu đề 2" value={updates.headline[1]} onChange={(value) => update("villageUpdates.headline[1]", value)} />
        <AdminImageField
          label="Ảnh mặc định"
          value={updates.imageSrc}
          onChange={(value) => update("villageUpdates.imageSrc", value)}
          fallbackSrc="/assets/village-hero.jpg"
          target="updates-default"
          hint="Dùng cho thẻ chưa có ảnh riêng."
        />
      </div>
      <div className="admin-card-stack">
        {updates.cards.map((card, index) => (
          <AdminCard key={card.id} index={index} title={card.label || `Hoạt động ${index + 1}`}>
            <div className="admin-form-grid admin-form-grid-wide">
              <AdminField label="Tên hoạt động" value={card.label} onChange={(value) => update(`villageUpdates.cards[${index}].label`, value)} />
              <AdminField label="Thời gian" value={card.meta} onChange={(value) => update(`villageUpdates.cards[${index}].meta`, value)} />
              <AdminImageField
                label="Ảnh hoạt động"
                value={card.imageSrc || ""}
                fallbackSrc={updates.imageSrc}
                onChange={(value) => update(`villageUpdates.cards[${index}].imageSrc`, value)}
                alt={card.imageAlt}
                onAltChange={(value) => update(`villageUpdates.cards[${index}].imageAlt`, value)}
                position={card.imagePosition}
                onPositionChange={(value) => update(`villageUpdates.cards[${index}].imagePosition`, value)}
                target={`updates-${card.id}`}
              />
            </div>
          </AdminCard>
        ))}
      </div>
    </AdminPanel>
  );
}

function AdminOverview({ draft, onSelect }) {
  const counts = [
    ["Khung cảnh", draft.storyFrames.length],
    ["Ảnh theo mùa", draft.seasonalGallery.photos.length],
    ["Tư liệu", draft.villageArchive.cards.length],
    ["Hoạt động", draft.villageUpdates.cards.length],
  ];

  return (
    <AdminPanel eyebrow="TỔNG QUAN" title="Nội dung trang chủ" description="Chọn một nhóm nội dung để chỉnh sửa. Mọi thay đổi chỉ xuất hiện trên trang chủ sau khi bạn bấm lưu.">
      <div className="admin-stat-grid">
        {counts.map(([label, count]) => <div className="admin-stat" key={label}><strong>{count}</strong><span>{label}</span></div>)}
      </div>
      <div className="admin-overview-grid">
        {ADMIN_SECTIONS.map((section, index) => (
          <button className="admin-overview-item" type="button" key={section.id} onClick={() => onSelect(section.id)}>
            <span className="admin-overview-item-top">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <ArrowUpRight aria-hidden="true" />
            </span>
            <strong>{section.label}</strong>
            <small>{section.description}</small>
          </button>
        ))}
      </div>
    </AdminPanel>
  );
}

function getInitialSection() {
  if (typeof window === "undefined") return "overview";
  return getAdminSectionFromHash(window.location.hash);
}

export default function AdminPage({ onLogout }) {
  const { content, saveContent } = useSiteContent();
  const [serverDraft, setServerDraft] = useState(null);
  const [serverDraftLoading, setServerDraftLoading] = useState(isSupabaseConfigured);
  const restoredDraftRef = useRef();
  if (restoredDraftRef.current === undefined) restoredDraftRef.current = loadSiteContentDraft();
  const [draft, setDraft] = useState(() => restoredDraftRef.current || clone(content));
  const [activeSection, setActiveSection] = useState(getInitialSection);
  const [sectionQuery, setSectionQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState("");
  const [cardCommandState, setCardCommandState] = useState({ action: "", version: 0 });
  const [previewFocusTarget, setPreviewFocusTarget] = useState("");
  const editorRef = useRef(null);
  const contentSnapshot = useMemo(() => JSON.stringify(content), [content]);
  const draftSnapshot = useMemo(() => JSON.stringify(draft), [draft]);
  const dirty = draftSnapshot !== contentSnapshot;
  const publishedSnapshotRef = useRef(contentSnapshot);
  const lastDraftSnapshotRef = useRef("");
  const adminCardCommand = useMemo(() => ({
    ...cardCommandState,
    issue: (action) => setCardCommandState((current) => ({ action, version: current.version + 1 })),
  }), [cardCommandState]);
  const normalizedSectionQuery = normalizeSearchText(sectionQuery.trim());
  const visibleNavItems = useMemo(() => {
    if (!normalizedSectionQuery) return ADMIN_NAV_ITEMS;
    return ADMIN_NAV_ITEMS.filter((section) => normalizeSearchText(`${section.label} ${section.description}`).includes(normalizedSectionQuery));
  }, [normalizedSectionQuery]);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let active = true;
    getSession()
      .then((session) => session?.user ? getDraftContent(session.user.id) : null)
      .then((result) => {
        if (!active) return;
        setServerDraft(result);
        if (result?.content) setDraft(result.content);
      })
      .catch((error) => active && setSaveError(error?.message || "Không thể tải bản nháp từ máy chủ."))
      .finally(() => active && setServerDraftLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (publishedSnapshotRef.current !== contentSnapshot) {
      const previousPublishedSnapshot = publishedSnapshotRef.current;
      setDraft((current) => JSON.stringify(current) === previousPublishedSnapshot ? clone(content) : current);
      publishedSnapshotRef.current = contentSnapshot;
    }
  }, [content, contentSnapshot]);

  useEffect(() => {
    if (!dirty) {
      if (!isSupabaseConfigured) clearSiteContentDraft();
      lastDraftSnapshotRef.current = draftSnapshot;
      return undefined;
    }
    if (lastDraftSnapshotRef.current === draftSnapshot || serverDraftLoading) return undefined;

    const persistTimer = window.setTimeout(async () => {
      try {
        if (isSupabaseConfigured) {
          const session = await getSession();
          if (!session?.user) throw new Error("Phiên quản trị đã hết hạn.");
          const result = await saveDraftContent(draft, session.user.id, serverDraft?.version ?? null);
          setServerDraft(result);
        } else {
          persistSiteContentDraft(draft);
        }
        lastDraftSnapshotRef.current = draftSnapshot;
      } catch (error) {
        setSaveError(error?.name === "QuotaExceededError" ? "Bộ nhớ tạm đã đầy. Hãy dùng ảnh nhỏ hơn hoặc xóa ảnh cũ." : error?.message || "Không thể lưu bản nháp.");
      }
    }, 450);

    return () => window.clearTimeout(persistTimer);
  }, [dirty, draft, draftSnapshot, serverDraft?.version, serverDraftLoading]);

  useEffect(() => {
    const handleHashChange = () => setActiveSection(getInitialSection());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const update = (path, value) => {
    setDraft((current) => setAtPath(current, path, value));
    setNotice("");
    setSaveError("");
  };

  const selectSection = (section) => {
    setActiveSection(section);
    setPreviewFocusTarget("");
    setSectionQuery("");
    window.history.replaceState(null, "", getAdminHash(section));
  };

  const jumpToEditor = () => {
    editorRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };

  const handleSave = async () => {
    try {
      const normalizedContent = await saveContent(draft);
      if (!isSupabaseConfigured) clearSiteContentDraft();
      publishedSnapshotRef.current = JSON.stringify(normalizedContent);
      lastDraftSnapshotRef.current = publishedSnapshotRef.current;
      setNotice("Đã lưu nội dung trang chủ trên máy chủ.");
      setSaveError("");
    } catch (error) {
      setSaveError(error?.message || "Không thể lưu nội dung.");
    }
  };

  const handleReset = () => {
    if (!window.confirm("Tạo bản nháp từ nội dung mặc định? Trang chủ hiện tại vẫn giữ nguyên cho đến khi bạn bấm Lưu thay đổi.")) return;
    setDraft(cloneDefaultSiteContent());
    setNotice("Đã tạo bản nháp mặc định. Trang chủ chưa thay đổi.");
    setSaveError("");
  };

  const handleDiscardDraft = () => {
    if (!window.confirm("Bỏ toàn bộ bản nháp hiện tại? Nội dung đã lưu trên trang chủ sẽ được giữ nguyên.")) return;
    if (!isSupabaseConfigured) clearSiteContentDraft();
    setDraft(clone(content));
    setNotice("Đã bỏ bản nháp. Trang chủ vẫn giữ nội dung đã lưu.");
    setSaveError("");
  };

  const handleExport = () => {
    const data = JSON.stringify(draft, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "xa-me-linh-content.json";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Đã xuất bản sao nội dung.");
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = normalizeSiteContent(JSON.parse(reader.result));
        setDraft(imported);
        setNotice("Đã nạp bản sao. Bấm lưu để áp dụng lên trang chủ.");
        setSaveError("");
      } catch {
        setSaveError("Tệp nội dung không đúng định dạng JSON của trang này.");
      }
    };
    reader.onerror = () => setSaveError("Không thể đọc tệp nội dung.");
    reader.readAsText(file);
  };

  const renderEditor = () => {
    switch (activeSection) {
      case "settings": return <SettingsEditor draft={draft} update={update} />;
      case "hero": return <HeroEditor draft={draft} update={update} />;
      case "story": return <StoryEditor draft={draft} update={update} />;
      case "statement": return <StatementEditor draft={draft} update={update} />;
      case "seasons": return <SeasonsEditor draft={draft} update={update} />;
      case "visit": return <VisitEditor draft={draft} update={update} />;
      case "archive": return <ArchiveEditor draft={draft} update={update} />;
      case "community": return <CommunityEditor draft={draft} update={update} />;
      case "updates": return <UpdatesEditor draft={draft} update={update} />;
      case "closing": return <ClosingEditor draft={draft} update={update} />;
      default: return <AdminOverview draft={draft} onSelect={selectSection} />;
    }
  };

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <a className="admin-back-link" href={getPublicHomeHref(typeof window === "undefined" ? "/" : window.location.pathname, getAdminPublicTarget("overview"))} title="Về trang chủ">
          <ArrowLeft aria-hidden="true" />
          <span>{content.settings.siteName}</span>
        </a>
        <div className="admin-topbar-title">
          <Settings aria-hidden="true" />
          <strong>Quản trị nội dung</strong>
          <span className={`admin-save-state${dirty ? " is-dirty" : ""}`}>{dirty ? "Bản nháp tạm" : "Đã đồng bộ"}</span>
        </div>
        <div className="admin-topbar-actions">
          <a className="admin-secondary-button admin-icon-text-button" href={getPublicHomeHref(typeof window === "undefined" ? "/" : window.location.pathname, getAdminPublicTarget("overview"))} target="_blank" rel="noreferrer" aria-label="Xem trang chủ">
            <Eye aria-hidden="true" />
            <span>Xem trang</span>
          </a>
          <button className="admin-primary-button admin-icon-text-button" type="button" onClick={handleSave} disabled={!dirty} aria-label="Lưu thay đổi">
            <Save aria-hidden="true" />
            <span>Lưu thay đổi</span>
          </button>
          {onLogout && (
            <button className="admin-secondary-button admin-icon-text-button admin-logout-btn" type="button" onClick={onLogout} title="Đăng xuất khỏi trang quản trị">
              <LogOut aria-hidden="true" />
              <span>Đăng xuất</span>
            </button>
          )}
        </div>
      </header>

      <div className="admin-layout">
        <aside className="admin-sidebar" aria-label="Nhóm nội dung">
          <div className="admin-sidebar-heading">
            <p className="admin-sidebar-eyebrow">CMS / MÊ LINH</p>
            <h1>Trang chủ</h1>
            <div className="admin-sidebar-search">
              <Search aria-hidden="true" />
              <input
                type="search"
                value={sectionQuery}
                onChange={(event) => setSectionQuery(event.target.value)}
                placeholder="Tìm nhóm nội dung"
                aria-label="Tìm nhóm nội dung"
                aria-controls="admin-section-navigation"
              />
              {sectionQuery && (
                <button type="button" onClick={() => setSectionQuery("")} aria-label="Xóa tìm kiếm nhóm nội dung" title="Xóa tìm kiếm">
                  <X aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          <nav className="admin-section-nav" id="admin-section-navigation">
            {visibleNavItems.map((section) => (
              <button className={activeSection === section.id ? "is-active" : ""} type="button" key={section.id} onClick={() => selectSection(section.id)} aria-current={activeSection === section.id ? "page" : undefined}>
                <span className="admin-nav-label"><span className="admin-nav-index">{section.index}</span>{section.label}</span>
                <small>{section.description}</small>
              </button>
            ))}
            {normalizedSectionQuery && visibleNavItems.length === 0 && <p className="admin-nav-empty">Không tìm thấy nhóm phù hợp.</p>}
          </nav>
          <div className="admin-sidebar-footer">
            <p>Bản nháp được tự lưu trên trình duyệt này; chỉ khi bấm Lưu thay đổi mới xuất bản.</p>
            <button className="admin-text-button" type="button" onClick={handleReset}>
              <RotateCcw aria-hidden="true" />
              <span>Tạo bản nháp mặc định</span>
            </button>
          </div>
        </aside>

        <AdminCardCommandContext.Provider value={adminCardCommand}>
          <AdminImageTargetContext.Provider value={setPreviewFocusTarget}>
          <main className="admin-main">
          <div className="admin-main-heading">
            <div>
              <p className="admin-main-eyebrow">{content.settings.siteName} / NỘI DUNG</p>
              <h2><span key={activeSection} className="admin-heading-transition">{activeSection === "overview" ? "Chỉnh sửa trang giới thiệu" : ADMIN_SECTIONS.find((section) => section.id === activeSection)?.label}</span></h2>
            </div>
            <div className="admin-data-actions">
              <button className="admin-secondary-button admin-icon-text-button" type="button" onClick={handleExport}>
                <Download aria-hidden="true" />
                <span>Xuất JSON</span>
              </button>
              <label className="admin-secondary-button admin-icon-text-button" title="Nạp tệp JSON">
                <FileJson aria-hidden="true" />
                <span>Nạp JSON</span>
                <input className="sr-only" type="file" accept="application/json,.json" onChange={handleImport} />
              </label>
            </div>
          </div>

          {notice && <p className="admin-notice" role="status" aria-live="polite"><Check aria-hidden="true" /> {notice}</p>}
          {saveError && <p className="admin-error" role="alert">{saveError}</p>}
          <div className="admin-content-stage" key={activeSection}>
            <div className="admin-editor-stage" ref={editorRef}>
              {renderEditor()}
            </div>
            <AdminLivePreview draft={draft} activeSection={activeSection} dirty={dirty} focusTarget={previewFocusTarget} />
          </div>
          {dirty && (
            <div className="admin-save-dock" role="status">
              <div>
                <strong>Bản nháp đã tự lưu</strong>
                <span>Chỉ “Lưu thay đổi” mới cập nhật trang chủ.</span>
              </div>
              <button className="admin-save-dock-discard" type="button" onClick={handleDiscardDraft}>Bỏ bản nháp</button>
              <button className="admin-primary-button admin-icon-text-button" type="button" onClick={handleSave} aria-label="Lưu bản nháp">
                <Save aria-hidden="true" />
                <span>Lưu</span>
              </button>
            </div>
          )}
          </main>
          </AdminImageTargetContext.Provider>
        </AdminCardCommandContext.Provider>
      </div>
    </div>
  );
}
