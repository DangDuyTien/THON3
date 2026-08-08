import { requireSupabase, supabase } from "./supabase.js";

const SITE_MEDIA_BUCKET = "site-media";
const SUBMISSION_MEDIA_BUCKET = "submission-media";

function safeExtension(file) {
  const extension = file.name?.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  return extension && extension.length <= 8 ? extension : "bin";
}

export async function uploadMedia(file, { bucket = SITE_MEDIA_BUCKET, ownerId, siteKey = "default" } = {}) {
  const client = requireSupabase();
  if (!(file instanceof File)) throw new Error("Tệp ảnh không hợp lệ.");
  if (!file.type.startsWith("image/")) throw new Error("Chỉ nhận tệp hình ảnh.");

  const assetId = crypto.randomUUID();
  const path = `${bucket === SITE_MEDIA_BUCKET ? `site/${siteKey}` : "submission"}/${assetId}/original.${safeExtension(file)}`;
  const { error: uploadError } = await client.storage.from(bucket).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data, error } = await client.from("media_assets").insert({
    id: assetId,
    storage_bucket: bucket,
    storage_path: path,
    original_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    uploaded_by: ownerId || null,
  }).select("*").single();
  if (error) {
    await client.storage.from(bucket).remove([path]);
    throw error;
  }
  return data;
}

export async function createSignedMediaUrl(asset, expiresIn = 3600) {
  if (!asset || !supabase) return asset?.storage_path || "";
  const { data, error } = await supabase.storage
    .from(asset.storage_bucket || SITE_MEDIA_BUCKET)
    .createSignedUrl(asset.storage_path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function removeMedia(asset) {
  const client = requireSupabase();
  if (!asset?.storage_path) return;
  const bucket = asset.storage_bucket || SITE_MEDIA_BUCKET;
  const { error: storageError } = await client.storage.from(bucket).remove([asset.storage_path]);
  if (storageError) throw storageError;
  const { error } = await client.from("media_assets").update({ deleted_at: new Date().toISOString() }).eq("id", asset.id);
  if (error) throw error;
}

export { SITE_MEDIA_BUCKET, SUBMISSION_MEDIA_BUCKET };
