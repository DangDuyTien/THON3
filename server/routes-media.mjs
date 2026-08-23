import crypto from "node:crypto";
import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import { pool } from "./db.mjs";
import { requireCsrf, requireUser, requireRole } from "./auth.mjs";
import { writeAuditLog } from "./security.mjs";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const formatMimeTypes = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };
const imageKitPrivateKey = String(process.env.IMAGEKIT_PRIVATE_KEY || "").trim();
const imageKitFolder = String(process.env.IMAGEKIT_FOLDER || "/thon3/site").trim() || "/thon3/site";
const imageKitConfigured = Boolean(imageKitPrivateKey);
const imageKitFreeMaxMediaBytes = 25 * 1024 * 1024;
const configuredMaxMediaBytes = Number(process.env.MAX_MEDIA_BYTES);
const requestedMaxMediaBytes = Number.isFinite(configuredMaxMediaBytes) && configuredMaxMediaBytes > 0
  ? configuredMaxMediaBytes
  : imageKitFreeMaxMediaBytes;
const maxMediaBytes = imageKitConfigured
  ? Math.min(requestedMaxMediaBytes, imageKitFreeMaxMediaBytes)
  : requestedMaxMediaBytes;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxMediaBytes },
  fileFilter: (_req, file, callback) => callback(null, allowedTypes.has(file.mimetype)),
});

const router = Router();

async function validateImage(file) {
  try {
    const metadata = await sharp(file.buffer, { limitInputPixels: 40_000_000 }).metadata();
    const mimeType = formatMimeTypes[metadata.format];
    if (!mimeType || !metadata.width || !metadata.height || metadata.width > 12_000 || metadata.height > 12_000) throw new Error();
    return { mimeType, width: metadata.width, height: metadata.height };
  } catch {
    const error = new Error("Tệp tải lên không phải ảnh JPG, PNG, WebP hoặc AVIF hợp lệ.");
    error.statusCode = 400;
    throw error;
  }
}

function imageKitAuthorization() {
  return `Basic ${Buffer.from(`${imageKitPrivateKey}:`).toString("base64")}`;
}

async function parseImageKitResponse(response, fallbackMessage) {
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (response.ok) return payload;
  const error = new Error(payload?.message || fallbackMessage);
  error.statusCode = 502;
  throw error;
}

async function uploadToImageKit(file) {
  const form = new FormData();
  form.append("file", new Blob([file.buffer], { type: file.mimetype }), file.originalname);
  form.append("fileName", file.originalname);
  form.append("folder", imageKitFolder);
  form.append("useUniqueFileName", "true");
  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Authorization: imageKitAuthorization() },
    body: form,
  });
  return parseImageKitResponse(response, "ImageKit không nhận được ảnh.");
}

async function deleteImageKitFile(fileId) {
  const response = await fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: { Authorization: imageKitAuthorization() },
  });
  await parseImageKitResponse(response, "Không thể xóa ảnh trên ImageKit.");
}

router.get("/", requireUser, requireRole("admin", "editor"), async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const includeDeleted = req.query.deleted === "true";
    if (includeDeleted && req.user.role !== "admin") return res.status(403).json({ error: "Chỉ quản trị viên được xem thùng rác ảnh." });
    const [rows] = await pool.execute(
      `SELECT id, storage_path, storage_provider, original_name, mime_type, size_bytes, created_at, deleted_at
       FROM media_assets
       WHERE ${includeDeleted ? "deleted_at IS NOT NULL" : "deleted_at IS NULL"}
       ORDER BY ${includeDeleted ? "deleted_at" : "created_at"} DESC
       LIMIT ${limit}`,
    );
    return res.json({
      data: rows.map((asset) => ({
        ...asset,
        storage_path: asset.storage_provider === "imagekit" ? asset.storage_path : `/api/media/${asset.id}`,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireUser, requireCsrf, requireRole("admin", "editor"), upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Chỉ nhận tệp ảnh JPG, PNG, WebP hoặc AVIF." });
    const imageInfo = await validateImage(req.file);
    req.file.mimetype = imageInfo.mimeType;
    const assetId = crypto.randomUUID();
    const imageKitAsset = imageKitConfigured ? await uploadToImageKit(req.file) : null;
    const storagePath = imageKitAsset?.url || `site/default/${assetId}`;
    try {
      await pool.execute(
        `INSERT INTO media_assets (id, storage_path, storage_provider, provider_file_id, original_name, mime_type, size_bytes, uploaded_by, content_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          assetId,
          storagePath,
          imageKitAsset ? "imagekit" : "tidb",
          imageKitAsset?.fileId || null,
          req.file.originalname,
          req.file.mimetype,
          imageKitAsset?.size || req.file.size,
          req.user.id,
          imageKitAsset ? null : req.file.buffer,
        ],
      );
    } catch (error) {
      if (imageKitAsset?.fileId) await deleteImageKitFile(imageKitAsset.fileId).catch(() => {});
      throw error;
    }
    await writeAuditLog({
      req,
      userId: req.user.id,
      action: "media.uploaded",
      entityType: "media",
      entityId: assetId,
      details: { mimeType: imageInfo.mimeType, sizeBytes: req.file.size, width: imageInfo.width, height: imageInfo.height },
    });
    return res.status(201).json({
      data: {
        id: assetId,
        storage_path: imageKitAsset?.url || `/api/media/${assetId}`,
        original_name: req.file.originalname,
        mime_type: req.file.mimetype,
        size_bytes: imageKitAsset?.size || req.file.size,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      "SELECT storage_path, storage_provider, content_data, mime_type, size_bytes FROM media_assets WHERE id = ? AND deleted_at IS NULL LIMIT 1",
      [req.params.id],
    );
    const asset = rows[0];
    if (!asset) return res.status(404).json({ error: "Không tìm thấy ảnh." });
    if (asset.storage_provider === "imagekit" && asset.storage_path) return res.redirect(302, asset.storage_path);
    if (!asset.content_data) return res.status(404).json({ error: "Không tìm thấy ảnh." });
    res.type(asset.mime_type);
    if (asset.mime_type === "image/svg+xml") res.set("Content-Security-Policy", "default-src 'none'; sandbox");
    res.set("Content-Length", String(asset.size_bytes));
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    return res.send(asset.content_data);
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", requireUser, requireCsrf, requireRole("admin", "editor"), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      "SELECT storage_provider, provider_file_id FROM media_assets WHERE id = ? AND deleted_at IS NULL LIMIT 1",
      [req.params.id],
    );
    const asset = rows[0];
    if (!asset) return res.status(404).json({ error: "Không tìm thấy ảnh." });
    const [result] = await pool.execute("UPDATE media_assets SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: "Không tìm thấy ảnh." });
    await writeAuditLog({ req, userId: req.user.id, action: "media.deleted", entityType: "media", entityId: req.params.id });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/restore", requireUser, requireCsrf, requireRole("admin"), async (req, res, next) => {
  try {
    const [result] = await pool.execute("UPDATE media_assets SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: "Không tìm thấy ảnh đã xóa." });
    await writeAuditLog({ req, userId: req.user.id, action: "media.restored", entityType: "media", entityId: req.params.id });
    return res.json({ data: { id: req.params.id, restored: true } });
  } catch (error) {
    return next(error);
  }
});

export default router;
