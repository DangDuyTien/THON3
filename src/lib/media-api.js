import { apiRequest, apiUrl, getCsrfToken, isBackendConfigured } from "./backend-api.js";

const SITE_MEDIA_BUCKET = "site-media";
export const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
export const MAX_SUBMISSION_MEDIA_BYTES = 4 * 1024 * 1024;
export const MEDIA_ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

function parseUploadPayload(text, status) {
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (status < 200 || status >= 300) {
    const error = new Error(payload?.error || `Yêu cầu tải ảnh thất bại (${status}).`);
    error.status = status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export async function uploadMedia(file, { onProgress, signal } = {}) {
  if (!isBackendConfigured) throw new Error("Backend chưa được cấu hình.");
  if (!(file instanceof File)) throw new Error("Tệp ảnh không hợp lệ.");
  if (!file.type.startsWith("image/")) throw new Error("Chỉ nhận tệp hình ảnh.");
  const form = new FormData();
  form.append("file", file);

  if (typeof onProgress !== "function" && !signal) {
    return (await apiRequest("/api/media", { method: "POST", body: form })).data;
  }

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    request.open("POST", apiUrl("/api/media"), true);
    request.withCredentials = true;
    if (getCsrfToken()) request.setRequestHeader("X-CSRF-Token", getCsrfToken());
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    });
    request.addEventListener("load", () => {
      try {
        const payload = parseUploadPayload(request.responseText, request.status);
        resolve(payload?.data);
      } catch (error) {
        reject(error);
      }
    });
    request.addEventListener("error", () => reject(new Error("Không thể kết nối máy chủ khi tải ảnh.")));
    request.addEventListener("abort", () => reject(new Error("Đã hủy tải ảnh.")));
    signal?.addEventListener("abort", abort, { once: true });
    request.send(form);
  });
}

export async function uploadSubmissionMedia(file) {
  if (!isBackendConfigured) throw new Error("Backend chưa được cấu hình.");
  if (!(file instanceof File)) throw new Error("Tệp ảnh không hợp lệ.");
  if (!MEDIA_ACCEPT.split(",").includes(file.type)) throw new Error("Chỉ nhận ảnh JPG, PNG, WebP hoặc AVIF.");
  if (file.size > MAX_SUBMISSION_MEDIA_BYTES) throw new Error("Ảnh cần có dung lượng tối đa 4 MB.");
  const form = new FormData();
  form.append("file", file);
  return (await apiRequest("/api/media/submission", { method: "POST", body: form })).data;
}

export async function listMediaAssets({ limit = 200 } = {}) {
  if (!isBackendConfigured) throw new Error("Backend chưa được cấu hình.");
  const query = new URLSearchParams({ limit: String(Math.min(Math.max(Number(limit) || 1, 1), 500)) });
  return (await apiRequest(`/api/media?${query.toString()}`)).data || [];
}

export async function listDeletedMediaAssets({ limit = 100 } = {}) {
  if (!isBackendConfigured) throw new Error("Backend chưa được cấu hình.");
  const query = new URLSearchParams({ deleted: "true", limit: String(Math.min(Math.max(Number(limit) || 1, 1), 500)) });
  return (await apiRequest(`/api/media?${query.toString()}`)).data || [];
}

export function createSignedMediaUrl(asset) {
  if (!asset?.storage_path) return "";
  return asset.storage_path.startsWith("http") ? asset.storage_path : apiUrl(asset.storage_path);
}

export async function removeMedia(asset) {
  if (!isBackendConfigured || !asset?.id) throw new Error("Không thể xóa ảnh khi backend chưa kết nối.");
  await apiRequest(`/api/media/${asset.id}`, { method: "DELETE" });
}

export async function restoreMedia(asset) {
  if (!isBackendConfigured || !asset?.id) throw new Error("Không thể khôi phục ảnh khi backend chưa kết nối.");
  return (await apiRequest(`/api/media/${asset.id}/restore`, { method: "POST" })).data;
}

export { SITE_MEDIA_BUCKET };
