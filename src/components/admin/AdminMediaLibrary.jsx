import { Check, FolderOpen, ImagePlus, LoaderCircle, Search, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isBackendConfigured } from "../../lib/backend-api.js";
import { listMediaAssets, MAX_MEDIA_BYTES, MEDIA_ACCEPT, uploadMedia } from "../../lib/media-api.js";
import { getImageAttributes } from "../../media.js";

const MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function formatBytes(value) {
  if (!value) return "0 KB";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function getAssetSrc(asset) {
  const source = asset?.storage_path || asset?.url || "";
  return getImageAttributes(source, "small")?.src || source;
}

function fileKey(file, index) {
  return `${file.name}-${file.size}-${file.lastModified}-${index}`;
}

function updateQueueItem(setQueue, key, patch) {
  setQueue((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
}

export default function AdminMediaLibrary({ request, onClose }) {
  const filesInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const [assets, setAssets] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [query, setQuery] = useState("");
  const [queue, setQueue] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const uploading = queue.some((item) => item.status === "uploading" || item.status === "pending");
  const loadAssets = useCallback(async () => {
    if (!isBackendConfigured) {
      setLoading(false);
      setError("Backend MySQL chưa được cấu hình nên chưa thể mở thư viện ảnh.");
      return;
    }
    setLoading(true);
    try {
      setAssets(await listMediaAssets());
      setError("");
    } catch (loadError) {
      setError(loadError?.message || "Không thể tải thư viện ảnh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!request) return undefined;
    setQuery("");
    setSelectedAssets([]);
    setNotice("");
    setQueue([]);
    loadAssets();
    return undefined;
  }, [loadAssets, request]);

  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return assets;
    return assets.filter((asset) => String(asset.original_name || "").toLocaleLowerCase().includes(normalizedQuery));
  }, [assets, query]);

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length || uploading) return;
    const validFiles = files.filter((file) => MEDIA_TYPES.has(file.type) && file.size <= MAX_MEDIA_BYTES);
    const rejectedCount = files.length - validFiles.length;
    if (!validFiles.length) {
      setError(`Không có ảnh hợp lệ. Chỉ nhận JPG, PNG, WebP hoặc AVIF, tối đa ${formatBytes(MAX_MEDIA_BYTES)} mỗi ảnh.`);
      return;
    }

    const items = validFiles.map((file, index) => ({
      file,
      key: fileKey(file, index),
      progress: 0,
      status: "pending",
    }));
    setQueue(items);
    setError("");
    setNotice(rejectedCount ? `Đã bỏ qua ${rejectedCount} tệp không phải ảnh hoặc vượt dung lượng.` : "");
    const uploaded = [];

    for (const item of items) {
      updateQueueItem(setQueue, item.key, { status: "uploading", progress: 0 });
      try {
        const asset = await uploadMedia(item.file, {
          onProgress: (progress) => updateQueueItem(setQueue, item.key, { progress: Math.round(progress * 100) }),
        });
        const nextAsset = { ...asset, original_name: asset.original_name || item.file.name, size_bytes: asset.size_bytes || item.file.size };
        uploaded.push(nextAsset);
        updateQueueItem(setQueue, item.key, { asset: nextAsset, progress: 100, status: "success" });
        setAssets((current) => [nextAsset, ...current.filter((currentAsset) => currentAsset.id !== nextAsset.id)]);
        setSelectedAssets((current) => {
          if (!request?.multiple) return [nextAsset];
          const maxSelect = Math.max(1, request.maxSelect || Infinity);
          return current.length < maxSelect ? [...current, nextAsset] : current;
        });
      } catch (uploadError) {
        updateQueueItem(setQueue, item.key, { error: uploadError?.message || "Không tải được ảnh.", status: "error" });
      }
    }

    if (uploaded.length) setNotice(`Đã tải ${uploaded.length}/${validFiles.length} ảnh vào thư viện.${request?.multiple ? " Các ảnh mới đã được chọn sẵn." : request?.onSelect ? " Chọn một ảnh để gán vào ô đang chỉnh sửa." : ""}`);
  };

  const toggleAsset = (asset) => {
    setSelectedAssets((current) => {
      if (!request?.multiple) return [asset];
      const selectedIndex = current.findIndex((item) => item.id === asset.id);
      if (selectedIndex >= 0) return current.filter((item) => item.id !== asset.id);
      if (current.length >= Math.max(1, request.maxSelect || Infinity)) return current;
      return [...current, asset];
    });
  };

  const selectAssets = () => {
    if (request?.multiple) {
      if (!selectedAssets.length || !request?.onSelectMany) return;
      request.onSelectMany(selectedAssets);
      onClose();
      return;
    }
    if (!selectedAssets[0] || !request?.onSelect) return;
    request.onSelect(selectedAssets[0]);
    onClose();
  };

  if (!request) return null;

  return (
    <div className="admin-media-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !uploading) onClose(); }}>
      <section className="admin-media-modal" role="dialog" aria-modal="true" aria-labelledby="admin-media-title">
        <header className="admin-media-modal-header">
          <div>
            <p className="admin-panel-eyebrow">MEDIA / THƯ VIỆN ẢNH</p>
            <h2 id="admin-media-title">{request.title ? `Chọn ảnh cho ${request.title}` : "Thư viện ảnh"}</h2>
            <p>{request.multiple ? `Chọn tối đa ${request.maxSelect} ảnh theo đúng thứ tự muốn hiển thị.` : "Tải nhiều ảnh một lần, theo dõi tiến độ từng tệp rồi chọn ảnh để gán vào nội dung."}</p>
          </div>
          <button className="admin-media-modal-close" type="button" onClick={onClose} disabled={uploading} aria-label="Đóng thư viện ảnh" title={uploading ? "Đợi tải xong để đóng" : "Đóng thư viện ảnh"}>
            <X aria-hidden="true" />
          </button>
        </header>

        <div
          className={`admin-media-dropzone${dragging ? " is-dragging" : ""}`}
          onDragEnter={(event) => { event.preventDefault(); if (!uploading) setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
          onDrop={(event) => { event.preventDefault(); setDragging(false); uploadFiles(event.dataTransfer.files); }}
        >
          <span className="admin-media-dropzone-icon"><ImagePlus aria-hidden="true" /></span>
          <div>
            <strong>Kéo thả nhiều ảnh vào đây</strong>
            <span>JPG, PNG, WebP, AVIF hoặc SVG · tối đa {formatBytes(MAX_MEDIA_BYTES)} mỗi ảnh</span>
          </div>
          <div className="admin-media-upload-actions">
            <button className="admin-primary-button admin-icon-text-button" type="button" disabled={uploading} onClick={() => filesInputRef.current?.click()}>
              <Upload aria-hidden="true" />
              <span>Chọn nhiều ảnh</span>
            </button>
            <button className="admin-secondary-button admin-icon-text-button" type="button" disabled={uploading} onClick={() => folderInputRef.current?.click()}>
              <FolderOpen aria-hidden="true" />
              <span>Chọn thư mục</span>
            </button>
          </div>
          <input ref={filesInputRef} className="sr-only" type="file" accept={MEDIA_ACCEPT} multiple onChange={(event) => { uploadFiles(event.target.files); event.target.value = ""; }} />
          <input ref={folderInputRef} className="sr-only" type="file" accept={MEDIA_ACCEPT} multiple webkitdirectory="" directory="" onChange={(event) => { uploadFiles(event.target.files); event.target.value = ""; }} />
        </div>

        {queue.length > 0 && (
          <div className="admin-media-queue" aria-live="polite">
            {queue.map((item) => (
              <div className={`admin-media-queue-item is-${item.status}`} key={item.key}>
                <span className="admin-media-queue-status" aria-hidden="true">
                  {item.status === "uploading" ? <LoaderCircle /> : item.status === "success" ? <Check /> : item.status === "error" ? <X /> : <Upload />}
                </span>
                <span className="admin-media-queue-name" title={item.file.name}>{item.file.name}</span>
                <span className="admin-media-queue-size">{formatBytes(item.file.size)}</span>
                <progress max="100" value={item.progress} aria-label={`${item.file.name}: ${item.progress}%`} />
                <span className="admin-media-queue-progress">{item.status === "error" ? "Lỗi" : `${item.progress}%`}</span>
                {item.error && <small>{item.error}</small>}
              </div>
            ))}
          </div>
        )}

        <div className="admin-media-library-toolbar">
          <div>
            <strong>{assets.length} ảnh trong thư viện</strong>
            <span>{loading ? "Đang tải danh sách…" : "Ảnh mới nhất nằm ở đầu danh sách"}</span>
          </div>
          <label className="admin-media-search">
            <Search aria-hidden="true" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên tệp" aria-label="Tìm ảnh theo tên tệp" />
          </label>
        </div>

        {error && <p className="admin-media-message is-error" role="alert">{error}</p>}
        {notice && <p className="admin-media-message" role="status">{notice}</p>}
        <div className="admin-media-grid">
          {loading ? (
            <div className="admin-media-empty is-loading"><LoaderCircle /><span>Đang mở thư viện ảnh…</span></div>
          ) : filteredAssets.length ? filteredAssets.map((asset) => {
            const selectedIndex = selectedAssets.findIndex((item) => item.id === asset.id);
            return (
            <button className={`admin-media-asset${selectedIndex >= 0 ? " is-selected" : ""}`} type="button" key={asset.id} onClick={() => toggleAsset(asset)} aria-pressed={selectedIndex >= 0}>
              <span className="admin-media-asset-image"><img src={getAssetSrc(asset)} alt="" loading="lazy" /></span>
              <span className="admin-media-asset-copy"><strong title={asset.original_name}>{asset.original_name}</strong><small>{formatBytes(asset.size_bytes)}</small></span>
              {selectedIndex >= 0 && <span className="admin-media-asset-check" aria-label={request.multiple ? `Ảnh thứ ${selectedIndex + 1}` : "Đã chọn"}>{request.multiple ? selectedIndex + 1 : <Check />}</span>}
            </button>
            );
          }) : (
            <div className="admin-media-empty"><ImagePlus /><span>{query ? "Không tìm thấy ảnh phù hợp." : "Chưa có ảnh trong thư viện. Hãy tải ảnh đầu tiên."}</span></div>
          )}
        </div>

        <footer className="admin-media-modal-footer">
          <span>{request.multiple ? `Đã chọn ${selectedAssets.length}/${request.maxSelect} ảnh${selectedAssets.length ? " · thứ tự chọn là thứ tự điền vào khung" : ""}` : selectedAssets[0] ? `Đang chọn: ${selectedAssets[0].original_name}` : request.onSelect ? "Chọn một ảnh để gán vào ô đang mở." : "Có thể mở thư viện từ đây để quản lý ảnh."}</span>
          <div>
            <button className="admin-secondary-button" type="button" onClick={onClose} disabled={uploading}>Đóng</button>
            {(request.onSelect || request.onSelectMany) && <button className="admin-primary-button admin-icon-text-button" type="button" onClick={selectAssets} disabled={!selectedAssets.length || uploading}><Check aria-hidden="true" /><span>{request.multiple ? `Dùng ${selectedAssets.length} ảnh` : "Chọn ảnh này"}</span></button>}
          </div>
        </footer>
      </section>
    </div>
  );
}
