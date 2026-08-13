import { apiRequest, apiUrl, isBackendConfigured } from "./backend-api.js";

const SITE_MEDIA_BUCKET = "site-media";
const SUBMISSION_MEDIA_BUCKET = "submission-media";

export async function uploadMedia(file) {
  if (!isBackendConfigured) throw new Error("Backend chưa được cấu hình.");
  if (!(file instanceof File)) throw new Error("Tệp ảnh không hợp lệ.");
  if (!file.type.startsWith("image/")) throw new Error("Chỉ nhận tệp hình ảnh.");
  const form = new FormData();
  form.append("file", file);
  return (await apiRequest("/api/media", { method: "POST", body: form })).data;
}

export async function createSignedMediaUrl(asset) {
  if (!asset?.storage_path) return "";
  return asset.storage_path.startsWith("http") ? asset.storage_path : apiUrl(asset.storage_path);
}

export async function removeMedia(asset) {
  if (!isBackendConfigured || !asset?.id) throw new Error("Không thể xóa ảnh khi backend chưa kết nối.");
  await apiRequest(`/api/media/${asset.id}`, { method: "DELETE" });
}

export { SITE_MEDIA_BUCKET, SUBMISSION_MEDIA_BUCKET };
