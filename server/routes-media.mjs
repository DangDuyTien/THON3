import crypto from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { pool } from "./db.mjs";
import { requireUser, requireRole } from "./auth.mjs";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/svg+xml"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_MEDIA_BYTES || 15 * 1024 * 1024) },
  fileFilter: (_req, file, callback) => callback(null, allowedTypes.has(file.mimetype)),
});

const router = Router();

router.post("/", requireUser, requireRole("admin", "editor"), upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Chỉ nhận tệp ảnh JPG, PNG, WebP, AVIF hoặc SVG." });
    const assetId = crypto.randomUUID();
    const storagePath = `site/default/${assetId}`;
    await pool.execute(
      `INSERT INTO media_assets (id, storage_path, original_name, mime_type, size_bytes, uploaded_by, content_data)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [assetId, storagePath, req.file.originalname, req.file.mimetype, req.file.size, req.user.id, req.file.buffer],
    );
    return res.status(201).json({ data: { id: assetId, storage_path: `/api/media/${assetId}`, original_name: req.file.originalname, mime_type: req.file.mimetype, size_bytes: req.file.size } });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      "SELECT content_data, mime_type, size_bytes FROM media_assets WHERE id = ? AND deleted_at IS NULL LIMIT 1",
      [req.params.id],
    );
    const asset = rows[0];
    if (!asset?.content_data) return res.status(404).json({ error: "Không tìm thấy ảnh." });
    res.type(asset.mime_type);
    res.set("Content-Length", String(asset.size_bytes));
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    return res.send(asset.content_data);
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", requireUser, requireRole("admin", "editor"), async (req, res, next) => {
  try {
    const [result] = await pool.execute("UPDATE media_assets SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: "Không tìm thấy ảnh." });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
