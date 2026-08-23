import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import "../styles-admin.css";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PanelTopClose,
  PanelTopOpen,
  Download,
  Eye,
  EyeOff,
  FileJson,
  FolderOpen,
  ImagePlus,
  KeyRound,
  LogOut,
  MoreHorizontal,
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
import AdminMediaLibrary from "./admin/AdminMediaLibrary.jsx";
import AdminPasswordDialog from "./admin/AdminPasswordDialog.jsx";
import {
  cloneDefaultSiteContent,
  normalizeSiteContent,
} from "../content/content-store.js";
import { getDraftContent, saveDraftContent } from "../lib/content-api.js";
import { isBackendConfigured } from "../lib/backend-api.js";
import { getSession } from "../lib/auth-api.js";
import { MAX_MEDIA_BYTES, MEDIA_ACCEPT, uploadMedia } from "../lib/media-api.js";
import { useSiteContent } from "../content/SiteContentProvider.jsx";
import { listPendingSubmissions, rejectSubmission, approveSubmission } from "../lib/submission-api.js";
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
const AdminMediaLibraryContext = createContext(null);

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

const ARCHIVE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/svg+xml"]);

function getArchiveImageLabel(filename) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Không đọc được kích thước ảnh."));
    };
    image.src = objectUrl;
  });
}

function getArchiveCardAspectRatio(card, archive) {
  const width = card.imageSrc ? card.imageWidth : archive.imageWidth;
  const height = card.imageSrc ? card.imageHeight : archive.imageHeight;
  return width && height ? `${width} / ${height}` : "3 / 4";
}

function hasSameAspectRatio(width, height, currentWidth, currentHeight) {
  if (!width || !height || !currentWidth || !currentHeight) return false;
  return Math.abs((width / height) - (currentWidth / currentHeight)) < 0.001;
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

function AdminImageField({ label, value, onChange, hint, alt, onAltChange, position, onPositionChange, fallbackSrc, fit, aspectRatio, target, onDimensionsChange }) {
  const onTarget = useContext(AdminImageTargetContext);
  const mediaLibrary = useContext(AdminMediaLibraryContext);
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
      aspectRatio={aspectRatio}
      target={target}
      onTarget={onTarget}
      onOpenLibrary={mediaLibrary ? () => mediaLibrary.open({
        title: label,
        onSelect: (asset) => {
          const imageSrc = asset?.storage_path || asset?.url;
          if (!imageSrc) return;
          onChange(imageSrc);
          onTarget?.(target);
        },
      }) : undefined}
      onDimensionsChange={onDimensionsChange}
    />
  );
}

function AdminSectionImageUploader({ title, description, targets, update }) {
  const filesInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const [limit, setLimit] = useState(targets.length);
  const [autoText, setAutoText] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState(null);

  useEffect(() => {
    setLimit((current) => Math.min(Math.max(current || 1, 1), targets.length));
  }, [targets.length]);

  const uploadFiles = async (fileList) => {
    if (uploading) return;
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (!isBackendConfigured) {
      setResult({ type: "error", message: "Backend MySQL chưa được cấu hình nên chưa thể tải ảnh." });
      return;
    }

    const validFiles = files
      .filter((file) => ARCHIVE_IMAGE_TYPES.has(file.type) && file.size <= MAX_MEDIA_BYTES)
      .sort((first, second) => (first.webkitRelativePath || first.name).localeCompare(
        second.webkitRelativePath || second.name,
        "vi",
        { numeric: true, sensitivity: "base" },
      ));
    const selectedFiles = validFiles.slice(0, Math.min(limit, targets.length));
    const rejectedCount = files.length - validFiles.length;
    const skippedCount = validFiles.length - selectedFiles.length;

    if (!selectedFiles.length) {
      setResult({ type: "error", message: `Không có ảnh hợp lệ. Chỉ nhận JPG, PNG, WebP, AVIF hoặc SVG, tối đa ${Math.round(MAX_MEDIA_BYTES / 1024 / 1024)} MB mỗi ảnh.` });
      return;
    }

    setUploading(true);
    setProgress({ current: 0, total: selectedFiles.length });
    setResult(null);
    const failedFiles = [];
    const pendingChanges = [];
    let uploadedCount = 0;

    for (let index = 0; index < selectedFiles.length; index += 1) {
      const file = selectedFiles[index];
      try {
        const asset = await uploadMedia(file);
        const imageSrc = asset.storage_path || asset.url;
        if (!imageSrc) throw new Error("Máy chủ không trả về URL ảnh.");

        const target = targets[uploadedCount];
        const fileLabel = getArchiveImageLabel(file.name) || `Ảnh ${uploadedCount + 1}`;
        pendingChanges.push([target.imagePath, imageSrc]);
        if (autoText) {
          if (target.labelPath) pendingChanges.push([target.labelPath, fileLabel]);
          if (target.altPath && target.altPath !== target.labelPath) {
            pendingChanges.push([target.altPath, target.altPrefix ? `${target.altPrefix} ${fileLabel}` : fileLabel]);
          }
        }
        uploadedCount += 1;
      } catch (error) {
        failedFiles.push(`${file.name}: ${error?.message || "Không tải được ảnh."}`);
      }
      setProgress({ current: index + 1, total: selectedFiles.length });
    }

    pendingChanges.forEach(([path, value]) => update(path, value));
    const problemCount = rejectedCount + failedFiles.length;
    setResult({
      type: uploadedCount ? (problemCount ? "warning" : "success") : "error",
      message: `Đã tự điền ${uploadedCount}/${selectedFiles.length} ảnh vào ${title.toLowerCase()}.${skippedCount ? ` Bỏ qua ${skippedCount} ảnh ngoài số lượng đã chọn.` : ""}${rejectedCount ? ` Có ${rejectedCount} tệp không hợp lệ.` : ""}`,
      details: failedFiles.slice(0, 3),
    });
    setUploading(false);
  };

  return (
    <section className="admin-section-auto-images" aria-busy={uploading}>
      <div className="admin-archive-bulk-copy">
        <span className="admin-archive-bulk-icon"><ImagePlus aria-hidden="true" /></span>
        <div>
          <strong>{title}</strong>
          <span>{description} · có {targets.length} khung ảnh</span>
        </div>
      </div>
      <div className="admin-section-auto-settings">
        <label className="admin-section-auto-count">
          <span>Số ảnh muốn lấy</span>
          <span className="admin-section-auto-number">
            <input
              type="number"
              min="1"
              max={targets.length}
              value={limit}
              disabled={uploading}
              onChange={(event) => setLimit(Math.min(Math.max(Number(event.target.value) || 1, 1), targets.length))}
            />
            <small>/ {targets.length}</small>
          </span>
        </label>
        <label className="admin-section-auto-toggle">
          <input type="checkbox" checked={autoText} disabled={uploading} onChange={(event) => setAutoText(event.target.checked)} />
          <span>Lấy tên tệp làm chữ hoặc mô tả ảnh</span>
        </label>
      </div>
      <div className="admin-archive-bulk-actions">
        <button className="admin-primary-button admin-icon-text-button" type="button" disabled={uploading} onClick={() => folderInputRef.current?.click()}>
          <FolderOpen aria-hidden="true" />
          <span>{uploading ? `Đang tải ${progress.current}/${progress.total}` : "Chọn thư mục"}</span>
        </button>
        <button className="admin-secondary-button admin-icon-text-button" type="button" disabled={uploading} onClick={() => filesInputRef.current?.click()}>
          <Upload aria-hidden="true" />
          <span>Chọn nhiều ảnh</span>
        </button>
      </div>
      <input
        ref={filesInputRef}
        className="sr-only"
        type="file"
        accept={MEDIA_ACCEPT}
        multiple
        onChange={(event) => {
          uploadFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={folderInputRef}
        className="sr-only"
        type="file"
        accept={MEDIA_ACCEPT}
        multiple
        webkitdirectory=""
        directory=""
        onChange={(event) => {
          uploadFiles(event.target.files);
          event.target.value = "";
        }}
      />
      {uploading && <progress className="admin-archive-bulk-progress" max={progress.total} value={progress.current} />}
      {result && (
        <div className={`admin-archive-bulk-result is-${result.type}`} role={result.type === "error" ? "alert" : "status"}>
          <span>{result.message}</span>
          {result.details?.map((detail) => <small key={detail}>{detail}</small>)}
        </div>
      )}
    </section>
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
  const menuImages = draft.settings.menuImages || [];
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
            <h3>Ảnh menu & đăng nhập</h3>
            <p>Thay bốn ảnh trong menu và ảnh hiển thị ở màn hình đăng nhập admin.</p>
          </div>
        </div>
        <AdminSectionImageUploader
          title="Tự điền ảnh menu"
          description="Ảnh được xếp theo thứ tự từ trái sang phải"
          targets={menuImages.map((_, index) => ({ imagePath: `settings.menuImages[${index}]` }))}
          update={update}
        />
        <div className="admin-form-grid admin-form-grid-wide">
          {menuImages.map((image, index) => (
            <AdminImageField
              key={`menu-image-${index}`}
              label={`Ảnh menu ${index + 1}`}
              value={image || ""}
              onChange={(value) => update(`settings.menuImages[${index}]`, value)}
              target={`menu-image-${index}`}
              fit="cover"
              aspectRatio="1 / 1"
            />
          ))}
          <AdminImageField
            label="Ảnh màn hình đăng nhập admin"
            value={draft.settings.adminLoginImage || ""}
            onChange={(value) => update("settings.adminLoginImage", value)}
            alt={draft.settings.adminLoginImageAlt}
            onAltChange={(value) => update("settings.adminLoginImageAlt", value)}
            target="admin-login-image"
            fit="cover"
            aspectRatio="1 / 1"
            hint="Ảnh này được dùng cho bốn ô ảnh bên trái màn hình đăng nhập."
          />
        </div>
      </div>

      <div className="admin-settings-section">
        <div className="admin-settings-section-heading">
          <span>03</span>
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
          <span>04</span>
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
          <span>05</span>
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
          <span>06</span>
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
      <AdminSectionImageUploader
        title="Tự điền ảnh mở đầu"
        description="Ảnh được xếp vào các khung cảnh theo thứ tự tên tệp"
        targets={draft.storyFrames.map((_, index) => ({
          imagePath: `storyFrames[${index}].imageSrc`,
          altPath: `storyFrames[${index}].description`,
        }))}
        update={update}
      />
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
      <AdminSectionImageUploader
        title="Tự điền ảnh câu chuyện"
        description="Thứ tự: ảnh câu chuyện, sau đó ảnh chữ ký"
        targets={[
          { imagePath: "villageMessage.imageSrc", altPath: "villageMessage.imageAlt" },
          { imagePath: "villageMessage.signatureImage", altPath: "villageMessage.signatureAlt" },
        ]}
        update={update}
      />
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
      <AdminSectionImageUploader
        title="Tự điền ảnh phần kết"
        description="Ảnh được đưa vào khung chân dung closing"
        targets={[{
          imagePath: "fullBleedArrival.portraitSrc",
          altPath: "fullBleedArrival.portraitAlt",
        }]}
        update={update}
      />
      <div className="admin-form-grid">
        <AdminField label="Nhãn chuyển cảnh" value={closing.transitionKicker} onChange={(value) => update("closing.transitionKicker", value)} />
        <AdminField label="Tiêu đề chuyển cảnh" value={closing.transitionTitle} onChange={(value) => update("closing.transitionTitle", value)} />
        <AdminField label="Nhãn nút ghé thăm" value={closing.visitLabel} onChange={(value) => update("closing.visitLabel", value)} />
        <AdminField label="Nhãn cột điều hướng" value={closing.navLabel} onChange={(value) => update("closing.navLabel", value)} />
        <AdminField label="Nhãn cột theo dõi" value={closing.networkLabel} onChange={(value) => update("closing.networkLabel", value)} />
        <AdminField label="Nhãn liên hệ" value={closing.contactLabel} onChange={(value) => update("closing.contactLabel", value)} />
        <AdminField label="Liên kết liên hệ" value={closing.contactHref} onChange={(value) => update("closing.contactHref", value)} hint="Ví dụ: /dong-hanh hoặc https://…" />
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
      <AdminSectionImageUploader
        title="Tự điền bộ ảnh theo mùa"
        description="Ảnh được xếp vào dải chuyển động theo thứ tự tên tệp"
        targets={gallery.photos.map((_, index) => ({
          imagePath: `seasonalGallery.photos[${index}].imageSrc`,
          labelPath: `seasonalGallery.photos[${index}].label`,
          altPath: `seasonalGallery.photos[${index}].imageAlt`,
          altPrefix: "Ảnh",
        }))}
        update={update}
      />
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
        <AdminField label="Liên kết" value={choice.href} onChange={(value) => update(`${path}.href`, value)} hint="Ví dụ: /cau-chuyen" />
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
      <AdminSectionImageUploader
        title="Tự điền ảnh hai lối trở về"
        description="Thứ tự: cổng trại, lối trái, lối phải và ảnh toàn cảnh"
        targets={[
          { imagePath: "visitChoices.gate.imageSrc", altPath: "visitChoices.gate.imageAlt" },
          { imagePath: "visitChoices.left.imageSrc", altPath: "visitChoices.left.imageAlt" },
          { imagePath: "visitChoices.right.imageSrc", altPath: "visitChoices.right.imageAlt" },
          { imagePath: "fullBleedArrival.imageSrc", altPath: "fullBleedArrival.imageAlt" },
        ]}
        update={update}
      />
      <div className="admin-form-grid">
        <AdminField label="Chú thích chung" value={draft.visitChoices.caption} onChange={(value) => update("visitChoices.caption", value)} />
      </div>
      <div className="admin-form-grid">
        <AdminImageField
          label="Ảnh cổng trại (3 mặt)"
          value={draft.visitChoices.gate?.imageSrc || ""}
          onChange={(value) => update("visitChoices.gate.imageSrc", value)}
          alt={draft.visitChoices.gate?.imageAlt || ""}
          onAltChange={(value) => update("visitChoices.gate.imageAlt", value)}
          target="visit-gate"
        />
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
  const [pendingList, setPendingList] = useState([]);

  useEffect(() => {
    let active = true;
    listPendingSubmissions()
      .then((items) => active && setPendingList(items))
      .catch(() => active && setPendingList([]));
    return () => { active = false; };
  }, []);

  const handleApprove = async (item) => {
    const newCard = {
      colorVariant: "archive-default",
      id: `member-${Date.now()}`,
      label: item.name,
      year: `${item.age} • ${item.school}`,
      imageAlt: `Đoàn viên ${item.name}`,
      imagePosition: "center 30%",
      imageSrc: item.imageSrc || item.image_src || "",
      altImageSrc: item.altImageSrc || item.alt_image_src || "",
      size: "medium",
    };
    update("villageArchive.cards", [...draft.villageArchive.cards, newCard]);
    await approveSubmission(item.id, newCard);
    setPendingList((current) => current.filter((entry) => entry.id !== item.id));
  };

  const handleReject = async (id) => {
    await rejectSubmission(id);
    setPendingList((current) => current.filter((item) => item.id !== id));
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

function ArchiveBulkUploader({ cards, onChange }) {
  const filesInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [limit, setLimit] = useState(0);
  const [autoText, setAutoText] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState(null);

  const uploadFiles = async (fileList, mode = "append") => {
    const files = Array.from(fileList || []);
    if (!files.length || uploading) return;
    if (!isBackendConfigured) {
      setResult({ type: "error", message: "Backend MySQL chưa được cấu hình nên chưa thể tải kho ảnh." });
      return;
    }

    const validFiles = files
      .filter((file) => ARCHIVE_IMAGE_TYPES.has(file.type) && file.size <= MAX_MEDIA_BYTES)
      .sort((first, second) => (first.webkitRelativePath || first.name).localeCompare(
        second.webkitRelativePath || second.name,
        "vi",
        { numeric: true, sensitivity: "base" },
      ));
    const acceptedFiles = limit > 0 ? validFiles.slice(0, limit) : validFiles;
    const rejectedCount = files.length - validFiles.length;
    const skippedCount = validFiles.length - acceptedFiles.length;
    if (!acceptedFiles.length) {
      setResult({ type: "error", message: `Không có ảnh hợp lệ. Chỉ nhận JPG, PNG, WebP, AVIF hoặc SVG, tối đa ${Math.round(MAX_MEDIA_BYTES / 1024 / 1024)} MB mỗi ảnh.` });
      return;
    }

    setUploading(true);
    setProgress({ current: 0, total: acceptedFiles.length });
    setResult(null);
    const addedCards = [];
    const failedFiles = [];

    for (let index = 0; index < acceptedFiles.length; index += 1) {
      const file = acceptedFiles[index];
      try {
        const { width, height } = await readImageDimensions(file);
        const asset = await uploadMedia(file);
        const imageSrc = asset.storage_path || asset.url;
        if (!imageSrc) throw new Error("Máy chủ không trả về URL ảnh.");
        const existingCount = mode === "replace" ? 0 : cards.length;
        const label = autoText
          ? getArchiveImageLabel(file.name) || `Ảnh ${existingCount + addedCards.length + 1}`
          : `Ảnh ${existingCount + addedCards.length + 1}`;
        addedCards.push({
          colorVariant: "archive-default",
          id: typeof globalThis.crypto?.randomUUID === "function" ? `archive-${globalThis.crypto.randomUUID()}` : `archive-${Date.now()}-${index}`,
          imageAlt: label,
          imageHeight: height,
          imagePosition: "center center",
          imageSrc,
          imageWidth: width,
          label,
          size: "medium",
          year: "",
        });
      } catch (error) {
        failedFiles.push(`${file.name}: ${error?.message || "Không tải được ảnh."}`);
      }
      setProgress({ current: index + 1, total: acceptedFiles.length });
    }

    if (addedCards.length) onChange(mode === "replace" ? addedCards : [...cards, ...addedCards]);
    const failedCount = rejectedCount + failedFiles.length;
    setResult({
      type: failedCount ? "warning" : "success",
      message: failedCount || skippedCount
        ? `${mode === "replace" ? "Đã thay kho bằng" : "Đã thêm"} ${addedCards.length} ảnh; ${failedCount} tệp không hợp lệ hoặc tải thất bại${skippedCount ? `; bỏ qua ${skippedCount} ảnh ngoài số lượng đã chọn` : ""}.`
        : mode === "replace"
          ? `Đã thay toàn bộ kho bằng ${addedCards.length} ảnh và tự sắp xếp theo tỷ lệ gốc.`
          : `Đã thêm ${addedCards.length} ảnh và tự sắp xếp theo tỷ lệ gốc.`,
      details: failedFiles.slice(0, 3),
    });
    setUploading(false);
  };

  return (
    <section
      className={`admin-archive-bulk${dragging ? " is-dragging" : ""}`}
      aria-busy={uploading}
      onDragEnter={(event) => { event.preventDefault(); if (!uploading) setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        uploadFiles(event.dataTransfer.files);
      }}
    >
      <div className="admin-archive-bulk-copy">
        <span className="admin-archive-bulk-icon"><ImagePlus aria-hidden="true" /></span>
        <div>
          <strong>Tải cả kho ảnh</strong>
          <span>JPG, PNG, WebP, AVIF hoặc SVG · tối đa {Math.round(MAX_MEDIA_BYTES / 1024 / 1024)} MB mỗi ảnh</span>
        </div>
      </div>
      <div className="admin-section-auto-settings">
        <label className="admin-section-auto-count">
          <span>Số ảnh muốn lấy</span>
          <span className="admin-section-auto-number">
            <input
              type="number"
              min="0"
              value={limit}
              disabled={uploading}
              onChange={(event) => setLimit(Math.max(Number(event.target.value) || 0, 0))}
            />
            <small>0 = tất cả</small>
          </span>
        </label>
        <label className="admin-section-auto-toggle">
          <input type="checkbox" checked={autoText} disabled={uploading} onChange={(event) => setAutoText(event.target.checked)} />
          <span>Lấy tên tệp làm tên ảnh</span>
        </label>
      </div>
      <div className="admin-archive-bulk-actions">
        <button className="admin-primary-button admin-icon-text-button" type="button" disabled={uploading} onClick={() => folderInputRef.current?.click()}>
          <FolderOpen aria-hidden="true" />
          <span>{uploading ? `Đang tải ${progress.current}/${progress.total}` : "Chọn thư mục và thay toàn bộ"}</span>
        </button>
        <button className="admin-secondary-button admin-icon-text-button" type="button" disabled={uploading} onClick={() => filesInputRef.current?.click()}>
          <Upload aria-hidden="true" />
          <span>Thêm nhiều ảnh</span>
        </button>
      </div>
      <input
        ref={filesInputRef}
        className="sr-only"
        type="file"
        accept={MEDIA_ACCEPT}
        multiple
        onChange={(event) => {
          uploadFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={folderInputRef}
        className="sr-only"
        type="file"
        accept={MEDIA_ACCEPT}
        multiple
        webkitdirectory=""
        directory=""
        onChange={(event) => {
          uploadFiles(event.target.files, "replace");
          event.target.value = "";
        }}
      />
      {uploading && <progress className="admin-archive-bulk-progress" max={progress.total} value={progress.current} />}
      {result && (
        <div className={`admin-archive-bulk-result is-${result.type}`} role={result.type === "error" ? "alert" : "status"}>
          <span>{result.message}</span>
          {result.details?.map((detail) => <small key={detail}>{detail}</small>)}
        </div>
      )}
    </section>
  );
}

function ArchiveEditor({ draft, update }) {
  const archive = draft.villageArchive;
  return (
    <AdminPanel eyebrow="07 / KHO ẢNH" title="Kho ảnh tự động" description="Tải nhiều ảnh một lần; lưới tự giữ tỷ lệ và lấp khoảng trống theo kích thước từng ảnh." cardCount={archive.cards.length}>
      <PendingYouthUnionApproval draft={draft} update={update} />
      <ArchiveBulkUploader cards={archive.cards} onChange={(cards) => update("villageArchive.cards", cards)} />
      <div className="admin-form-grid">
        <AdminField label="Nhãn nhỏ" value={archive.eyebrow} onChange={(value) => update("villageArchive.eyebrow", value)} />
        <AdminField label="Tiêu đề" multiline value={archive.title} onChange={(value) => update("villageArchive.title", value)} hint="Dùng xuống dòng để tách hai dòng lớn." />
        <AdminImageField
          label="Ảnh mặc định"
          value={archive.imageSrc}
          onChange={(value) => update("villageArchive.imageSrc", value)}
          fallbackSrc="/assets/village-hero.jpg"
          fit="contain"
          aspectRatio={archive.imageWidth && archive.imageHeight ? `${archive.imageWidth} / ${archive.imageHeight}` : "3 / 4"}
          target="archive-default"
          hint="Dùng làm ảnh dự phòng nếu một thẻ chưa có ảnh riêng."
          onDimensionsChange={({ width, height }) => {
            if (hasSameAspectRatio(width, height, archive.imageWidth, archive.imageHeight)) return;
            update("villageArchive.imageWidth", width);
            update("villageArchive.imageHeight", height);
          }}
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
                fit="contain"
                aspectRatio={getArchiveCardAspectRatio(card, archive)}
                target={`archive-${card.id}`}
                onDimensionsChange={({ width, height }) => {
                  if (hasSameAspectRatio(width, height, card.imageWidth, card.imageHeight)) return;
                  update(`villageArchive.cards[${index}].imageWidth`, width);
                  update(`villageArchive.cards[${index}].imageHeight`, height);
                }}
              />
              <AdminImageField
                label="Ảnh khi rê chuột (không bắt buộc)"
                value={card.altImageSrc || ""}
                onChange={(value) => update(`villageArchive.cards[${index}].altImageSrc`, value)}
                fit="contain"
                aspectRatio={getArchiveCardAspectRatio(card, archive)}
                target={`archive-${card.id}`}
              />
              <button
                className="admin-danger-text-button"
                type="button"
                onClick={() => {
                  if (window.confirm(`Xóa “${card.label || `Tư liệu ${index + 1}`}” khỏi lưới ảnh?`)) {
                    update("villageArchive.cards", archive.cards.filter((_, cardIndex) => cardIndex !== index));
                  }
                }}
              >
                <Trash2 aria-hidden="true" />
                <span>Xóa khỏi lưới</span>
              </button>
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
      <AdminSectionImageUploader
        title="Tự điền logo cộng đồng"
        description="Logo được xếp vào từng đơn vị theo thứ tự tên tệp"
        targets={partners.organizations.map((_, index) => ({
          imagePath: `communityPartners.organizations[${index}].logo`,
          labelPath: `communityPartners.organizations[${index}].label`,
          altPath: `communityPartners.organizations[${index}].logoAlt`,
          altPrefix: "Logo",
        }))}
        update={update}
      />
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
      <AdminSectionImageUploader
        title="Tự điền ảnh hoạt động"
        description="Ảnh được xếp vào từng hoạt động, ảnh cuối dùng làm ảnh mặc định"
        targets={[
          ...updates.cards.map((_, index) => ({
            imagePath: `villageUpdates.cards[${index}].imageSrc`,
            labelPath: `villageUpdates.cards[${index}].label`,
            altPath: `villageUpdates.cards[${index}].imageAlt`,
            altPrefix: "Ảnh",
          })),
          { imagePath: "villageUpdates.imageSrc" },
        ]}
        update={update}
      />
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
    ["Khung cảnh", draft.storyFrames.length, "hero"],
    ["Ảnh theo mùa", draft.seasonalGallery.photos.length, "seasons"],
    ["Kho ảnh", draft.villageArchive.cards.length, "archive"],
    ["Hoạt động", draft.villageUpdates.cards.length, "updates"],
  ];

  const quickActions = [
    ["hero", "Đổi ảnh mở đầu", "Khung đầu tiên người xem nhìn thấy"],
    ["updates", "Cập nhật hoạt động", "Sửa nội dung đang diễn ra hôm nay"],
    ["archive", "Tải nhiều ảnh", "Chọn cả thư mục và tự xếp ảnh"],
    ["closing", "Sửa liên hệ", "Cập nhật liên kết và kênh theo dõi"],
  ];

  return (
    <AdminPanel eyebrow="TỔNG QUAN" title="Nội dung trang chủ" description="Chọn một nhóm nội dung để chỉnh sửa. Mọi thay đổi chỉ xuất hiện trên trang chủ sau khi bạn bấm lưu.">
      <div className="admin-stat-grid">
        {counts.map(([label, count, section]) => (
          <button className="admin-stat" type="button" key={label} onClick={() => onSelect(section)}>
            <strong>{count}</strong>
            <span>{label}</span>
            <small>Mở để chỉnh <ArrowUpRight aria-hidden="true" /></small>
          </button>
        ))}
      </div>
      <section className="admin-quick-actions" aria-labelledby="admin-quick-actions-title">
        <div className="admin-quick-actions-heading">
          <div>
            <p className="admin-panel-eyebrow">LỐI TẮT THƯỜNG DÙNG</p>
            <h3 id="admin-quick-actions-title">Bạn muốn làm gì?</h3>
          </div>
          <span>Mở thẳng đúng khu vực cần chỉnh</span>
        </div>
        <div className="admin-quick-actions-grid">
          {quickActions.map(([section, label, description]) => (
            <button type="button" key={section} onClick={() => onSelect(section)}>
              <span><strong>{label}</strong><small>{description}</small></span>
              <ArrowUpRight aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
      <button className="admin-overview-bulk-entry" type="button" onClick={() => onSelect("archive")}>
        <span className="admin-overview-bulk-icon"><FolderOpen aria-hidden="true" /></span>
        <span className="admin-overview-bulk-copy">
          <small>KHO ẢNH TỰ ĐỘNG</small>
          <strong>Chọn cả thư mục, tự thay và xếp ảnh vừa khung</strong>
        </span>
        <span className="admin-overview-bulk-command">Mở kho ảnh <ArrowUpRight aria-hidden="true" /></span>
      </button>
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
  const [serverDraftLoading, setServerDraftLoading] = useState(true);
  const [draft, setDraft] = useState(() => clone(content));
  const [activeSection, setActiveSection] = useState(getInitialSection);
  const [sectionQuery, setSectionQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState("");
  const [draftSaveState, setDraftSaveState] = useState("idle");
  const [publishing, setPublishing] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(() => (
    typeof window === "undefined" || window.matchMedia("(min-width: 841px)").matches
  ));
  const [cardCommandState, setCardCommandState] = useState({ action: "", version: 0 });
  const [previewFocusTarget, setPreviewFocusTarget] = useState("");
  const [mediaLibraryRequest, setMediaLibraryRequest] = useState(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const editorRef = useRef(null);
  const sectionSearchRef = useRef(null);
  const contentSnapshot = useMemo(() => JSON.stringify(content), [content]);
  const draftSnapshot = useMemo(() => JSON.stringify(draft), [draft]);
  const dirty = draftSnapshot !== contentSnapshot;
  const activeSectionIndex = ADMIN_NAV_ITEMS.findIndex((section) => section.id === activeSection);
  const previousSection = ADMIN_NAV_ITEMS[activeSectionIndex - 1] || null;
  const nextSection = ADMIN_NAV_ITEMS[activeSectionIndex + 1] || null;
  const publishedSnapshotRef = useRef(contentSnapshot);
  const lastDraftSnapshotRef = useRef("");
  const adminCardCommand = useMemo(() => ({
    ...cardCommandState,
    issue: (action) => setCardCommandState((current) => ({ action, version: current.version + 1 })),
  }), [cardCommandState]);
  const openMediaLibrary = useCallback((request = {}) => {
    setMediaLibraryRequest(() => request);
  }, []);
  const mediaLibrary = useMemo(() => ({ open: openMediaLibrary }), [openMediaLibrary]);
  const normalizedSectionQuery = normalizeSearchText(sectionQuery.trim());
  const visibleNavItems = useMemo(() => {
    if (!normalizedSectionQuery) return ADMIN_NAV_ITEMS;
    return ADMIN_NAV_ITEMS.filter((section) => normalizeSearchText(`${section.label} ${section.description}`).includes(normalizedSectionQuery));
  }, [normalizedSectionQuery]);

  useEffect(() => {
    if (!isBackendConfigured) {
      setSaveError("Backend MySQL chưa được cấu hình.");
      setServerDraftLoading(false);
      return undefined;
    }
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
      lastDraftSnapshotRef.current = draftSnapshot;
      setDraftSaveState("idle");
      return undefined;
    }
    if (lastDraftSnapshotRef.current === draftSnapshot || serverDraftLoading) return undefined;

    setDraftSaveState("saving");
    const persistTimer = window.setTimeout(async () => {
      try {
        const session = await getSession();
        if (!session?.user) throw new Error("Phiên quản trị đã hết hạn.");
        const result = await saveDraftContent(draft, session.user.id, serverDraft?.version ?? null);
        setServerDraft(result);
        lastDraftSnapshotRef.current = draftSnapshot;
        setDraftSaveState("saved");
      } catch (error) {
        setDraftSaveState("error");
        setSaveError(error?.message || "Không thể lưu bản nháp trên máy chủ.");
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
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  const jumpToEditor = () => {
    editorRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };

  const handleSave = async () => {
    if (!dirty || publishing) return;
    setPublishing(true);
    try {
      const normalizedContent = await saveContent(draft);
      publishedSnapshotRef.current = JSON.stringify(normalizedContent);
      lastDraftSnapshotRef.current = publishedSnapshotRef.current;
      setNotice("Đã lưu nội dung trang chủ trên máy chủ.");
      setSaveError("");
    } catch (error) {
      setSaveError(error?.message || "Không thể lưu nội dung.");
    } finally {
      setPublishing(false);
    }
  };

  useEffect(() => {
    const handleKeyboardShortcut = (event) => {
      const target = event.target;
      const isTyping = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSave();
        return;
      }

      if (event.key === "/" && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        sectionSearchRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, [dirty, publishing, draft]);

  const draftStatusLabel = publishing
    ? "Đang xuất bản..."
    : !dirty
      ? "Đã đồng bộ"
      : draftSaveState === "saving"
        ? "Đang lưu nháp..."
        : draftSaveState === "error"
          ? "Lỗi lưu nháp"
          : "Đã lưu bản nháp";

  const handleReset = () => {
    if (!window.confirm("Tạo bản nháp từ nội dung mặc định? Trang chủ hiện tại vẫn giữ nguyên cho đến khi bạn bấm Lưu thay đổi.")) return;
    setDraft(cloneDefaultSiteContent());
    setNotice("Đã tạo bản nháp mặc định. Trang chủ chưa thay đổi.");
    setSaveError("");
  };

  const handleDiscardDraft = () => {
    if (!window.confirm("Bỏ toàn bộ bản nháp hiện tại? Nội dung đã lưu trên trang chủ sẽ được giữ nguyên.")) return;
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
          <span className={`admin-save-state${dirty ? " is-dirty" : ""}${draftSaveState === "error" ? " is-error" : ""}`}>{draftStatusLabel}</span>
        </div>
        <div className="admin-topbar-actions">
          <a className="admin-secondary-button admin-icon-text-button" href={getPublicHomeHref(typeof window === "undefined" ? "/" : window.location.pathname, getAdminPublicTarget("overview"))} target="_blank" rel="noreferrer" aria-label="Xem trang chủ">
            <Eye aria-hidden="true" />
            <span>Xem trang</span>
          </a>
          <button className="admin-primary-button admin-icon-text-button" type="button" onClick={handleSave} disabled={!dirty || publishing} aria-label="Lưu và xuất bản thay đổi">
            <Save aria-hidden="true" />
            <span>{publishing ? "Đang lưu..." : "Lưu thay đổi"}</span>
          </button>
          <details className="admin-more-menu">
            <summary className="admin-secondary-button" role="button" aria-label="Mở công cụ quản trị" title="Công cụ quản trị">
              <MoreHorizontal aria-hidden="true" />
              <span>Công cụ</span>
            </summary>
            <div className="admin-more-menu-popover" onClick={(event) => {
              if (event.target.closest("button, label")) event.currentTarget.parentElement.removeAttribute("open");
            }}>
              <button type="button" onClick={() => setPasswordDialogOpen(true)}><KeyRound aria-hidden="true" /><span><strong>Đổi mật khẩu</strong><small>Bảo mật tài khoản quản trị</small></span></button>
              <button type="button" onClick={handleExport}><Download aria-hidden="true" /><span><strong>Xuất bản sao JSON</strong><small>Tải nội dung hiện tại về máy</small></span></button>
              <label><FileJson aria-hidden="true" /><span><strong>Nạp bản sao JSON</strong><small>Khôi phục nội dung từ tệp</small></span><input className="sr-only" type="file" accept="application/json,.json" onChange={handleImport} /></label>
              <button type="button" onClick={handleReset}><RotateCcw aria-hidden="true" /><span><strong>Tạo bản nháp mặc định</strong><small>Không xuất bản cho tới khi bấm lưu</small></span></button>
              {onLogout && <button className="is-danger" type="button" onClick={onLogout}><LogOut aria-hidden="true" /><span><strong>Đăng xuất</strong><small>Thoát khỏi trang quản trị</small></span></button>}
            </div>
          </details>
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
                ref={sectionSearchRef}
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
            <p>Bản nháp tự lưu trên máy chủ. Nhấn <kbd>⌘/Ctrl S</kbd> để xuất bản.</p>
            <button className="admin-text-button" type="button" onClick={() => sectionSearchRef.current?.focus()}>
              <Search aria-hidden="true" />
              <span>Tìm nhanh bằng phím /</span>
            </button>
          </div>
        </aside>

        <AdminCardCommandContext.Provider value={adminCardCommand}>
          <AdminImageTargetContext.Provider value={setPreviewFocusTarget}>
          <AdminMediaLibraryContext.Provider value={mediaLibrary}>
          <main className="admin-main">
          <div className="admin-main-heading">
            <div>
              <p className="admin-main-eyebrow">{content.settings.siteName} / NỘI DUNG</p>
              <h2><span key={activeSection} className="admin-heading-transition">{activeSection === "overview" ? "Chỉnh sửa trang giới thiệu" : ADMIN_SECTIONS.find((section) => section.id === activeSection)?.label}</span></h2>
            </div>
            <div className="admin-data-actions">
              <button className="admin-secondary-button admin-icon-text-button" type="button" onClick={() => openMediaLibrary()}>
                <ImagePlus aria-hidden="true" />
                <span>Thư viện ảnh</span>
              </button>
              <button className={`admin-secondary-button admin-icon-text-button${previewVisible ? " is-active" : ""}`} type="button" onClick={() => setPreviewVisible((current) => !current)} aria-pressed={previewVisible}>
                {previewVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                <span>{previewVisible ? "Ẩn xem trước" : "Xem trước"}</span>
              </button>
            </div>
          </div>

          <nav className="admin-section-stepper" aria-label="Chuyển nhanh giữa các nhóm nội dung">
            <button type="button" disabled={!previousSection} onClick={() => previousSection && selectSection(previousSection.id)} title={previousSection ? `Về ${previousSection.label}` : "Đây là mục đầu tiên"}>
              <ChevronLeft aria-hidden="true" />
              <span>{previousSection?.label || "Mục trước"}</span>
            </button>
            <div>
              <strong>{String(activeSectionIndex + 1).padStart(2, "0")} / {String(ADMIN_NAV_ITEMS.length).padStart(2, "0")}</strong>
              <small>Dùng menu trái hoặc hai nút này để chuyển mục</small>
            </div>
            <button type="button" disabled={!nextSection} onClick={() => nextSection && selectSection(nextSection.id)} title={nextSection ? `Tới ${nextSection.label}` : "Đây là mục cuối cùng"}>
              <span>{nextSection?.label || "Mục sau"}</span>
              <ChevronRight aria-hidden="true" />
            </button>
          </nav>

          {notice && <p className="admin-notice" role="status" aria-live="polite"><Check aria-hidden="true" /> {notice}</p>}
          {saveError && <p className="admin-error" role="alert">{saveError}</p>}
          <div className={`admin-content-stage${previewVisible ? "" : " is-preview-hidden"}`} key={activeSection}>
            <div className="admin-editor-stage" ref={editorRef}>
              {renderEditor()}
            </div>
            {previewVisible && <AdminLivePreview draft={draft} activeSection={activeSection} dirty={dirty} focusTarget={previewFocusTarget} />}
          </div>
          {dirty && (
            <div className="admin-save-dock" role="status">
              <div>
                <strong>Bản nháp đã tự lưu</strong>
                <span>Chỉ “Lưu thay đổi” mới cập nhật trang chủ.</span>
              </div>
              <button className="admin-save-dock-discard" type="button" onClick={handleDiscardDraft}>Bỏ bản nháp</button>
              <button className="admin-primary-button admin-icon-text-button" type="button" onClick={handleSave} disabled={publishing} aria-label="Lưu và xuất bản bản nháp">
                <Save aria-hidden="true" />
                <span>{publishing ? "Đang lưu..." : "Xuất bản"}</span>
              </button>
            </div>
          )}
          </main>
          <AdminMediaLibrary request={mediaLibraryRequest} onClose={() => setMediaLibraryRequest(null)} />
          {passwordDialogOpen && <AdminPasswordDialog onClose={() => setPasswordDialogOpen(false)} />}
          </AdminMediaLibraryContext.Provider>
          </AdminImageTargetContext.Provider>
        </AdminCardCommandContext.Provider>
      </div>
    </div>
  );
}
