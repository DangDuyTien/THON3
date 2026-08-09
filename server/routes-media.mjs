import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { pool } from "./db.mjs";
import { requireUser, requireRole } from "./auth.mjs";

const mediaDir = path.resolve(process.env.MEDIA_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), "storage"));
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/svg+xml"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_MEDIA_BYTES || 50 * 1024 * 1024) },
  fileFilter: (_req, file, callback) => callback(null, allowedTypes.has(file.mimetype)),
});

const router = Router();

router.post("/", requireUser, requireRole("admin", "editor"), upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Chỉ nhận tệp ảnh JPG, PNG, WebP, AVIF hoặc SVG." });
    const assetId = crypto.randomUUID();
    const extension = (req.file.originalname.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const relativePath = path.join("site", "default", assetId, `original.${extension}`);
    const absolutePath = path.join(mediaDir, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, req.file.buffer, { flag: "wx" });
    await pool.execute(
      `INSERT INTO media_assets (id, storage_path, original_name, mime_type, size_bytes, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [assetId, relativePath, req.file.originalname, req.file.mimetype, req.file.size, req.user.id],
    );
    return res.status(201).json({ data: { id: assetId, storage_path: `/api/media/${assetId}`, original_name: req.file.originalname, mime_type: req.file.mimetype, size_bytes: req.file.size } });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const [rows] = await pool.execute("SELECT storage_path, mime_type, original_name FROM media_assets WHERE id = ? AND deleted_at IS NULL LIMIT 1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy ảnh." });
    const filePath = path.join(mediaDir, rows[0].storage_path);
    return res.type(rows[0].mime_type).sendFile(filePath, { root: "/" }, (error) => { if (error) next(error); });
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
