import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { pool, withTransaction } from "./db.mjs";
import { clearSessionCookie, issueSession, requireRole, requireUser, setSessionCookie } from "./auth.mjs";
import mediaRouter from "./routes-media.mjs";

const app = express();
const port = Number(process.env.PORT || process.env.API_PORT || 8787);
const siteKey = "default";

await pool.query("SELECT 1").catch((error) => {
  console.warn(`MySQL chưa kết nối: ${error.message}`);
});

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: process.env.JSON_LIMIT || "10mb" }));

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ data: { ok: true, service: "thon-api" } });
  } catch {
    res.status(503).json({ error: "Không kết nối được MySQL." });
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const [rows] = await pool.execute("SELECT id, email, password_hash, display_name, role, disabled_at FROM users WHERE email = ? LIMIT 1", [email]);
    const user = rows[0];
    if (!user || user.disabled_at || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: "Tài khoản hoặc mật khẩu không chính xác." });
    setSessionCookie(res, issueSession(user));
    return res.json({ data: { user: { id: user.id, email: user.email, display_name: user.display_name, role: user.role } } });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/logout", (_req, res) => { clearSessionCookie(res); res.status(204).end(); });
app.get("/api/auth/me", requireUser, (req, res) => res.json({ data: { user: req.user } }));
app.get("/api/auth/session", requireUser, (req, res) => res.json({ data: { user: req.user } }));

app.get("/api/content/published", async (_req, res, next) => {
  try {
    const [rows] = await pool.execute("SELECT content, version, updated_at FROM site_content WHERE site_key = ? LIMIT 1", [siteKey]);
    if (!rows[0]) return res.json({ data: null });
    return res.json({ data: { content: typeof rows[0].content === "string" ? JSON.parse(rows[0].content) : rows[0].content, version: rows[0].version, updated_at: rows[0].updated_at } });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/content/draft", requireUser, requireRole("admin", "editor"), async (req, res, next) => {
  try {
    const [rows] = await pool.execute("SELECT id, content, version, updated_at FROM site_content_drafts WHERE site_key = ? AND updated_by = ? LIMIT 1", [siteKey, req.user.id]);
    if (!rows[0]) return res.json({ data: null });
    return res.json({ data: { ...rows[0], content: typeof rows[0].content === "string" ? JSON.parse(rows[0].content) : rows[0].content } });
  } catch (error) {
    return next(error);
  }
});

app.put("/api/content/draft", requireUser, requireRole("admin", "editor"), async (req, res, next) => {
  try {
    if (!req.body?.content || typeof req.body.content !== "object") return res.status(400).json({ error: "Nội dung không hợp lệ." });
    const expectedVersion = req.body.expectedVersion == null ? null : Number(req.body.expectedVersion);
    const [currentRows] = await pool.execute("SELECT version FROM site_content_drafts WHERE site_key = ? AND updated_by = ? LIMIT 1", [siteKey, req.user.id]);
    const currentVersion = currentRows[0]?.version ?? 0;
    if (expectedVersion !== null && currentRows[0] && currentVersion !== expectedVersion) return res.status(409).json({ error: "Bản nháp đã được thay đổi. Hãy tải lại trước khi lưu.", version: currentVersion });
    const nextVersion = currentVersion + 1;
    await pool.execute(
      `INSERT INTO site_content_drafts (site_key, updated_by, content, version) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE content = VALUES(content), version = VALUES(version)`,
      [siteKey, req.user.id, JSON.stringify(req.body.content), nextVersion],
    );
    return res.json({ data: { content: req.body.content, version: nextVersion } });
  } catch (error) {
    return next(error);
  }
});

app.delete("/api/content/draft", requireUser, requireRole("admin", "editor"), async (req, res, next) => {
  try {
    await pool.execute("DELETE FROM site_content_drafts WHERE site_key = ? AND updated_by = ?", [siteKey, req.user.id]);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

app.post("/api/content/publish", requireUser, requireRole("admin"), async (req, res, next) => {
  try {
    if (!req.body?.content || typeof req.body.content !== "object") return res.status(400).json({ error: "Nội dung không hợp lệ." });
    const result = await withTransaction(async (connection) => {
      const [rows] = await connection.execute("SELECT version FROM site_content WHERE site_key = ? FOR UPDATE", [siteKey]);
      const currentVersion = rows[0]?.version ?? 0;
      if (req.body.expectedVersion != null && Number(req.body.expectedVersion) !== currentVersion) {
        const error = new Error("Nội dung đã được thay đổi bởi quản trị viên khác.");
        error.statusCode = 409;
        error.version = currentVersion;
        throw error;
      }
      const nextVersion = currentVersion + 1;
      await connection.execute(
        `INSERT INTO site_content (site_key, content, version, updated_by) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE content = VALUES(content), version = VALUES(version), updated_by = VALUES(updated_by)`,
        [siteKey, JSON.stringify(req.body.content), nextVersion, req.user.id],
      );
      return { content: req.body.content, version: nextVersion };
    });
    return res.json({ data: result });
  } catch (error) {
    return next(error);
  }
});

app.use("/api/media", mediaRouter);

app.post("/api/submissions", async (req, res, next) => {
  try {
    const { name, age, school, imageAssetId, altImageAssetId = null } = req.body || {};
    if (!name || !age || !school || !imageAssetId) return res.status(400).json({ error: "Thiếu thông tin đăng ký hoặc ảnh." });
    const [result] = await pool.execute(
      "INSERT INTO submissions (name, age, school, image_asset_id, alt_image_asset_id) VALUES (?, ?, ?, ?, ?)",
      [String(name).trim(), String(age).trim(), String(school).trim(), imageAssetId, altImageAssetId],
    );
    return res.status(201).json({ data: { id: result.insertId, status: "pending" } });
  } catch (error) { return next(error); }
});

app.get("/api/submissions", requireUser, requireRole("admin", "editor"), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT s.*, m.storage_path AS image_src, am.storage_path AS alt_image_src
       FROM submissions s JOIN media_assets m ON m.id = s.image_asset_id
       LEFT JOIN media_assets am ON am.id = s.alt_image_asset_id
       WHERE s.status = ? ORDER BY s.submitted_at DESC`,
      [req.query.status || "pending"],
    );
    return res.json({ data: rows.map((row) => ({ ...row, imageSrc: row.image_src ? `/api/media/${row.image_asset_id}` : "", altImageSrc: row.alt_image_src ? `/api/media/${row.alt_image_asset_id}` : "" })) });
  } catch (error) { return next(error); }
});

app.post("/api/submissions/:id/reject", requireUser, requireRole("admin", "editor"), async (req, res, next) => {
  try {
    await pool.execute("UPDATE submissions SET status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, review_note = ? WHERE id = ? AND status = 'pending'", [req.user.id, req.body?.reviewNote || "", req.params.id]);
    return res.json({ data: { id: req.params.id, status: "rejected" } });
  } catch (error) { return next(error); }
});

app.post("/api/submissions/:id/approve", requireUser, requireRole("admin", "editor"), async (req, res, next) => {
  try {
    await pool.execute("UPDATE submissions SET status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, approved_card = ? WHERE id = ? AND status = 'pending'", [req.user.id, JSON.stringify(req.body?.card || {}), req.params.id]);
    return res.json({ data: { id: req.params.id, status: "approved" } });
  } catch (error) { return next(error); }
});

app.use((error, _req, res, _next) => {
  if (error.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "Ảnh vượt quá dung lượng cho phép." });
  const status = error.statusCode || 500;
  if (status >= 500) console.error(error);
  return res.status(status).json({ error: error.message || "Lỗi máy chủ." });
});

app.listen(port, () => console.log(`Thôn API listening on http://localhost:${port}`));
