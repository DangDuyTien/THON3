import { ImagePlus, Link, LocateFixed, RotateCcw, Trash2, Upload } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import AdaptiveImage from "../AdaptiveImage.jsx";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function axisToPercent(value, axis) {
  if (typeof value !== "string") return 50;
  const normalized = value.toLowerCase().trim();
  if (/^\d+(\.\d+)?%$/.test(normalized)) return Math.min(100, Math.max(0, Number.parseFloat(normalized)));
  if (axis === "x") {
    if (normalized === "left") return 0;
    if (normalized === "right") return 100;
  }
  if (axis === "y") {
    if (normalized === "top") return 0;
    if (normalized === "bottom") return 100;
  }
  return 50;
}

export function parseImagePosition(value) {
  const parts = String(value || "center center").trim().split(/\s+/);
  if (parts.length === 1) {
    const verticalOnly = ["top", "bottom"].includes(parts[0].toLowerCase());
    return verticalOnly
      ? { x: 50, y: axisToPercent(parts[0], "y") }
      : { x: axisToPercent(parts[0], "x"), y: 50 };
  }
  return { x: axisToPercent(parts[0], "x"), y: axisToPercent(parts[1], "y") };
}

function formatBytes(value) {
  if (!value) return "";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function estimateDataUrlBytes(value) {
  if (typeof value !== "string" || !value.startsWith("data:")) return 0;
  return Math.round((value.length - (value.indexOf(",") + 1)) * 0.75);
}

export default function AdminImageEditor({
  label,
  value,
  onChange,
  alt,
  onAltChange,
  position,
  onPositionChange,
  fallbackSrc = "",
  fit = "cover",
  hint,
  target,
  onTarget,
}) {
  const generatedId = useId().replace(/:/g, "");
  const fileInputRef = useRef(null);
  const [urlValue, setUrlValue] = useState(typeof value === "string" && !value.startsWith("data:") ? value : "");
  const [error, setError] = useState("");
  const [imageInfo, setImageInfo] = useState(null);
  const effectiveSrc = value || fallbackSrc;
  const usingFallback = !value && Boolean(fallbackSrc);
  const focal = parseImagePosition(position);
  const uploadedBytes = estimateDataUrlBytes(value);

  useEffect(() => {
    if (typeof value === "string" && !value.startsWith("data:")) setUrlValue(value);
  }, [value]);

  const commitUrl = () => {
    const next = urlValue.trim();
    if (!next || next === value) return;
    setError("");
    onChange(next);
    onTarget?.(target);
  };

  const acceptFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Chỉ nhận tệp hình ảnh JPG, PNG, WebP, AVIF hoặc SVG.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Ảnh cần nhỏ hơn 4 MB để tránh đầy bộ nhớ bản nháp.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setError("");
      setUrlValue("");
      setImageInfo((current) => ({ ...current, name: file.name, bytes: file.size, type: file.type }));
      onChange(reader.result);
      onTarget?.(target);
    };
    reader.onerror = () => setError("Không thể đọc tệp ảnh này.");
    reader.readAsDataURL(file);
  };

  const handleFile = (event) => {
    acceptFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const updateFocal = (x, y) => {
    onPositionChange?.(`${Math.round(x)}% ${Math.round(y)}%`);
    onTarget?.(target);
  };

  const handleFocalPointer = (event) => {
    if (fit !== "cover" || !onPositionChange) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    updateFocal(
      Math.min(100, Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100)),
      Math.min(100, Math.max(0, ((event.clientY - bounds.top) / bounds.height) * 100)),
    );
  };

  return (
    <section className="admin-image-editor" onFocus={() => onTarget?.(target)} aria-labelledby={`admin-image-${generatedId}`}>
      <div className="admin-image-editor-heading">
        <div>
          <span className="admin-field-label" id={`admin-image-${generatedId}`}>{label}</span>
          <small>{usingFallback ? "Đang dùng ảnh mặc định" : value?.startsWith("data:") ? "Ảnh tải từ máy" : value ? "Ảnh từ đường dẫn" : "Chưa có ảnh"}</small>
        </div>
        {usingFallback && <span className="admin-image-fallback-badge">FALLBACK</span>}
      </div>

      <div className={`admin-image-crop${fit === "contain" ? " is-contain" : ""}`} onPointerDown={handleFocalPointer}>
        {effectiveSrc ? (
          <AdaptiveImage
            src={effectiveSrc}
            alt=""
            imagePosition={position}
            imageVariant="medium"
            loading="lazy"
            onLoad={(event) => {
              setError("");
              setImageInfo((current) => ({ ...current, width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }));
            }}
            onError={() => setError("Không tải được ảnh. Hãy kiểm tra lại URL hoặc chọn tệp khác.")}
          />
        ) : (
          <div className="admin-image-empty"><ImagePlus aria-hidden="true" /><span>Thêm ảnh để xem crop thực tế</span></div>
        )}
        {effectiveSrc && fit === "cover" && onPositionChange && (
          <span className="admin-image-focal-marker" style={{ left: `${focal.x}%`, top: `${focal.y}%` }} aria-hidden="true"><LocateFixed /></span>
        )}
      </div>

      <div className="admin-image-source-row">
        <div className="admin-image-url-control">
          <Link aria-hidden="true" />
          <input
            type="url"
            value={urlValue}
            onChange={(event) => setUrlValue(event.target.value)}
            onBlur={commitUrl}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitUrl();
              }
            }}
            placeholder="Dán URL hoặc /assets/... rồi Enter"
            aria-label={`${label} - URL ảnh`}
          />
        </div>
        <button className="admin-secondary-button admin-image-upload-button" type="button" onClick={() => fileInputRef.current?.click()}>
          <Upload aria-hidden="true" /><span>Tải ảnh</span>
        </button>
        {value && (
          <button className="admin-quiet-button admin-image-remove-button" type="button" onClick={() => { onChange(""); setUrlValue(""); }} aria-label={`Xóa ${label.toLowerCase()}`} title={fallbackSrc ? "Bỏ ảnh riêng và dùng ảnh mặc định" : "Xóa ảnh"}>
            <Trash2 aria-hidden="true" />
          </button>
        )}
        <input ref={fileInputRef} className="sr-only" type="file" accept="image/*" onChange={handleFile} />
      </div>

      {fit === "cover" && onPositionChange && effectiveSrc && (
        <div className="admin-image-focal-controls">
          <div className="admin-image-focal-title"><LocateFixed aria-hidden="true" /><span>Điểm lấy nét</span><code>{Math.round(focal.x)}% · {Math.round(focal.y)}%</code></div>
          <label>
            <span>Ngang</span>
            <input type="range" min="0" max="100" value={focal.x} onChange={(event) => updateFocal(Number(event.target.value), focal.y)} aria-label={`${label} - vị trí ngang`} />
          </label>
          <label>
            <span>Dọc</span>
            <input type="range" min="0" max="100" value={focal.y} onChange={(event) => updateFocal(focal.x, Number(event.target.value))} aria-label={`${label} - vị trí dọc`} />
          </label>
          <button type="button" onClick={() => updateFocal(50, 50)}><RotateCcw aria-hidden="true" /> Đặt giữa</button>
        </div>
      )}

      {onAltChange && (
        <label className="admin-image-alt-field">
          <span className="admin-field-label">Mô tả ảnh cho trình đọc màn hình</span>
          <textarea rows="2" value={alt || ""} onChange={(event) => onAltChange(event.target.value)} placeholder="Mô tả ngắn nội dung quan trọng trong ảnh" />
        </label>
      )}

      <div className="admin-image-meta">
        {imageInfo?.width && <span>{imageInfo.width} × {imageInfo.height}px</span>}
        {(imageInfo?.bytes || uploadedBytes) > 0 && <span>{formatBytes(imageInfo?.bytes || uploadedBytes)}</span>}
        {imageInfo?.type && <span>{imageInfo.type.replace("image/", "").toUpperCase()}</span>}
        {value?.startsWith("data:") && <span>Lưu kèm bản nháp trình duyệt</span>}
      </div>
      {hint && <p className="admin-field-hint">{hint}</p>}
      {uploadedBytes > MAX_IMAGE_BYTES * 0.75 && <p className="admin-image-warning">Ảnh này chiếm nhiều bộ nhớ. Nên nén ảnh trước khi thêm ảnh khác.</p>}
      {error && <p className="admin-field-error" role="alert">{error}</p>}
    </section>
  );
}
