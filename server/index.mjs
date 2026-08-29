import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { pool, withTransaction } from "./db.mjs";
import { contentCache } from "./content-cache.mjs";
import { clearSessionCookie, issueCsrfToken, issueSession, requireCsrf, requireRole, requireUser, SESSION_TTL_SECONDS, setSessionCookie, validateAdminPassword } from "./auth.mjs";
import mediaRouter from "./routes-media.mjs";
import { appendApprovedSubmissionCard, buildApprovedSubmissionCard } from "./submission-content.mjs";
import { isValidYouthBirthYear, isYouthSchoolOption } from "../src/lib/submission-options.js";
import {
  assertAuthAllowed,
  clearAuthFailures,
  consumeIpLimit,
  createEmailChallenge,
  getPublicSecurityConfig,
  getRequestIpHash,
  isEmailOtpRequired,
  normalizeEmail,
  recordAuthFailure,
  requireEmailDelivery,
  sendLoginAlert,
  validateContentPayload,
  verifyEmailChallenge,
  writeAuditLog,
} from "./security.mjs";

const app = express();
const port = Number(process.env.PORT || process.env.API_PORT || 8787);
const siteKey = "default";
const publicApiBaseUrl = String(process.env.PUBLIC_API_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/+$/, "");
const allowedOrigins = new Set([
  "http://localhost:5173",
  "https://thon3-1.onrender.com",
  ...String(process.env.CORS_ORIGIN || "").split(",").map((origin) => origin.trim()).filter(Boolean),
]);

const dummyPasswordHashPromise = bcrypt.hash("invalid-login-password", 12);

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set({
    "Content-Security-Policy": "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": req.path.startsWith("/api/media/") ? "cross-origin" : "same-site",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  });
  if (process.env.NODE_ENV === "production") res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: process.env.JSON_LIMIT || "5mb" }));
app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("Origin");
  if (!origin || allowedOrigins.has(origin)) return next();
  return res.status(403).json({ error: "Nguồn gửi yêu cầu không được phép." });
});

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ data: { ok: true, service: "thon-api" } });
  } catch {
    res.status(503).json({ error: "Không kết nối được MySQL." });
  }
});

async function completeLogin(req, res, user, action = "auth.login") {
  await pool.execute(
    "UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_login_ip_hash = ? WHERE id = ?",
    [getRequestIpHash(req), user.id],
  );
  await writeAuditLog({ req, userId: user.id, action, entityType: "user", entityId: user.id });
  const token = issueSession(user);
  setSessionCookie(res, token);
  sendLoginAlert({ user, req }).catch((error) => console.warn(`Không gửi được cảnh báo đăng nhập: ${error.message}`));
  return res.json({
    data: {
      user: { id: user.id, email: user.email, display_name: user.display_name, role: user.role },
      csrfToken: issueCsrfToken(token),
      expiresInSeconds: SESSION_TTL_SECONDS,
    },
  });
}

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    await assertAuthAllowed(req, email, "login");
    const [rows] = await pool.execute("SELECT id, email, password_hash, display_name, role, session_version, email_otp_enabled, disabled_at FROM users WHERE email = ? LIMIT 1", [email]);
    const user = rows[0];
    const passwordMatches = password.length <= 128 && await bcrypt.compare(password, user?.password_hash || await dummyPasswordHashPromise);
    if (!user || user.disabled_at || !passwordMatches) {
      await recordAuthFailure(req, email, "login");
      return res.status(401).json({ error: "Tài khoản hoặc mật khẩu không chính xác." });
    }
    await clearAuthFailures(req, email, "login");
    if (isEmailOtpRequired() || user.email_otp_enabled) {
      await assertAuthAllowed(req, email, "login-otp-request", 5);
      await recordAuthFailure(req, email, "login-otp-request");
      const challenge = await createEmailChallenge({ req, user, email, purpose: "login" });
      await writeAuditLog({ req, userId: user.id, action: "auth.login_challenge", entityType: "user", entityId: user.id });
      return res.json({ data: { mfaRequired: true, maskedEmail: getPublicSecurityConfig(user).maskedEmail, ...challenge } });
    }
    return completeLogin(req, res, user);
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/login/verify", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const user = await verifyEmailChallenge({
      req,
      challengeId: req.body?.challengeId,
      email,
      purpose: "login",
      code: req.body?.code,
    });
    await clearAuthFailures(req, email, "login-otp-request");
    return completeLogin(req, res, user, "auth.login_mfa");
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/logout", requireUser, requireCsrf, async (req, res, next) => {
  try {
    await writeAuditLog({ req, userId: req.user.id, action: "auth.logout", entityType: "user", entityId: req.user.id });
    clearSessionCookie(res);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});
app.get("/api/auth/me", requireUser, (req, res) => res.json({ data: { user: req.user } }));
app.get("/api/auth/session", requireUser, (req, res) => res.json({
  data: {
    user: req.user,
    csrfToken: issueCsrfToken(req.sessionToken),
    expiresInSeconds: SESSION_TTL_SECONDS,
    security: getPublicSecurityConfig(req.user),
  },
}));
app.get("/api/auth/security", requireUser, requireRole("admin", "editor"), (req, res) => res.json({
  data: {
    ...getPublicSecurityConfig(req.user),
    lastLoginAt: req.user.last_login_at,
    sessionExpiresInSeconds: SESSION_TTL_SECONDS,
  },
}));

app.post("/api/auth/password/change", requireUser, requireCsrf, requireRole("admin", "editor"), async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword || "");
    const nextPassword = validateAdminPassword(req.body?.newPassword);
    const [rows] = await pool.execute("SELECT password_hash FROM users WHERE id = ? LIMIT 1", [req.user.id]);
    if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password_hash))) return res.status(401).json({ error: "Mật khẩu hiện tại không chính xác." });
    const passwordHash = await bcrypt.hash(nextPassword, 12);
    await pool.execute("UPDATE users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?", [passwordHash, req.user.id]);
    const [updatedRows] = await pool.execute("SELECT id, email, display_name, role, session_version FROM users WHERE id = ? LIMIT 1", [req.user.id]);
    const updatedUser = updatedRows[0];
    const token = issueSession(updatedUser);
    setSessionCookie(res, token);
    await writeAuditLog({ req, userId: req.user.id, action: "auth.password_changed", entityType: "user", entityId: req.user.id });
    return res.json({ data: { changed: true, csrfToken: issueCsrfToken(token) } });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/mfa/request", requireUser, requireCsrf, requireRole("admin", "editor"), async (req, res, next) => {
  try {
    requireEmailDelivery();
    await assertAuthAllowed(req, req.user.email, "mfa-request", 5);
    const [rows] = await pool.execute("SELECT password_hash FROM users WHERE id = ? LIMIT 1", [req.user.id]);
    if (!rows[0] || !(await bcrypt.compare(String(req.body?.currentPassword || ""), rows[0].password_hash))) {
      return res.status(401).json({ error: "Mật khẩu hiện tại không chính xác." });
    }
    await recordAuthFailure(req, req.user.email, "mfa-request");
    const challenge = await createEmailChallenge({ req, user: req.user, email: req.user.email, purpose: "mfa" });
    await writeAuditLog({ req, userId: req.user.id, action: "auth.mfa_requested", entityType: "user", entityId: req.user.id });
    return res.json({ data: { ...challenge, maskedEmail: getPublicSecurityConfig(req.user).maskedEmail } });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/mfa/confirm", requireUser, requireCsrf, requireRole("admin", "editor"), async (req, res, next) => {
  try {
    const verifiedUser = await verifyEmailChallenge({
      req,
      challengeId: req.body?.challengeId,
      email: req.user.email,
      purpose: "mfa",
      code: req.body?.code,
    });
    if (Number(verifiedUser.id) !== Number(req.user.id)) return res.status(403).json({ error: "Mã xác thực không thuộc tài khoản này." });
    await pool.execute("UPDATE users SET email_otp_enabled = 1, session_version = session_version + 1 WHERE id = ?", [req.user.id]);
    const [updatedRows] = await pool.execute("SELECT id, email, display_name, role, session_version, email_otp_enabled FROM users WHERE id = ? LIMIT 1", [req.user.id]);
    const updatedUser = updatedRows[0];
    const token = issueSession(updatedUser);
    setSessionCookie(res, token);
    await writeAuditLog({ req, userId: req.user.id, action: "auth.mfa_enabled", entityType: "user", entityId: req.user.id });
    return res.json({ data: { enabled: true, csrfToken: issueCsrfToken(token), security: getPublicSecurityConfig(updatedUser) } });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/mfa/disable", requireUser, requireCsrf, requireRole("admin", "editor"), async (req, res, next) => {
  try {
    if (isEmailOtpRequired()) return res.status(400).json({ error: "Máy chủ đang bắt buộc xác thực hai bước cho mọi tài khoản." });
    const [rows] = await pool.execute("SELECT password_hash FROM users WHERE id = ? LIMIT 1", [req.user.id]);
    if (!rows[0] || !(await bcrypt.compare(String(req.body?.currentPassword || ""), rows[0].password_hash))) {
      return res.status(401).json({ error: "Mật khẩu hiện tại không chính xác." });
    }
    await pool.execute("UPDATE users SET email_otp_enabled = 0, session_version = session_version + 1 WHERE id = ?", [req.user.id]);
    const [updatedRows] = await pool.execute("SELECT id, email, display_name, role, session_version, email_otp_enabled FROM users WHERE id = ? LIMIT 1", [req.user.id]);
    const updatedUser = updatedRows[0];
    const token = issueSession(updatedUser);
    setSessionCookie(res, token);
    await writeAuditLog({ req, userId: req.user.id, action: "auth.mfa_disabled", entityType: "user", entityId: req.user.id });
    return res.json({ data: { enabled: false, csrfToken: issueCsrfToken(token), security: getPublicSecurityConfig(updatedUser) } });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/sessions/revoke", requireUser, requireCsrf, requireRole("admin", "editor"), async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword || "");
    const [rows] = await pool.execute("SELECT password_hash FROM users WHERE id = ? LIMIT 1", [req.user.id]);
    if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password_hash))) return res.status(401).json({ error: "Mật khẩu hiện tại không chính xác." });
    await pool.execute("UPDATE users SET session_version = session_version + 1 WHERE id = ?", [req.user.id]);
    await writeAuditLog({ req, userId: req.user.id, action: "auth.sessions_revoked", entityType: "user", entityId: req.user.id });
    clearSessionCookie(res);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/password/recovery/request", async (req, res, next) => {
  try {
    requireEmailDelivery();
    const email = normalizeEmail(req.body?.email);
    await assertAuthAllowed(req, email, "recovery-request", 5);
    await recordAuthFailure(req, email, "recovery-request");
    const [rows] = await pool.execute(
      "SELECT id, email, display_name, role, session_version FROM users WHERE email = ? AND role = 'admin' AND disabled_at IS NULL LIMIT 1",
      [email],
    );
    const challenge = await createEmailChallenge({ req, user: rows[0] || null, email, purpose: "recovery" });
    if (rows[0]) await writeAuditLog({ req, userId: rows[0].id, action: "auth.recovery_requested", entityType: "user", entityId: rows[0].id });
    return res.json({ data: { ...challenge, message: "Nếu email hợp lệ, mã khôi phục đã được gửi." } });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/password/recovery/confirm", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const nextPassword = validateAdminPassword(req.body?.newPassword);
    const user = await verifyEmailChallenge({
      req,
      challengeId: req.body?.challengeId,
      email,
      purpose: "recovery",
      code: req.body?.code,
    });
    const passwordHash = await bcrypt.hash(nextPassword, 12);
    await pool.execute("UPDATE users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?", [passwordHash, user.id]);
    await writeAuditLog({ req, userId: user.id, action: "auth.password_recovered", entityType: "user", entityId: user.id });
    return res.json({ data: { changed: true } });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/password/recover", (_req, res) => res.status(410).json({ error: "Hãy yêu cầu mã khôi phục dùng một lần qua email." }));

app.get("/api/content/published", async (_req, res, next) => {
  try {
    const cached = contentCache.getCachedContent();
    if (cached) {
      // Trả cache ngay lập tức; DB chỉ được chạm lại nền khi cache quá hạn (stale-while-revalidate).
      if (contentCache.isStale()) {
        contentCache.refreshFromDb().catch(() => {});
      }
      return res.json({ data: { content: cached.content, version: cached.version, updated_at: cached.updatedAt } });
    }
    const fresh = await contentCache.refreshFromDb();
    if (!fresh || fresh.content === null) return res.json({ data: null });
    return res.json({ data: { content: fresh.content, version: fresh.version, updated_at: fresh.updatedAt } });
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

app.put("/api/content/draft", requireUser, requireCsrf, requireRole("admin", "editor"), async (req, res, next) => {
  try {
    validateContentPayload(req.body?.content);
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

app.delete("/api/content/draft", requireUser, requireCsrf, requireRole("admin", "editor"), async (req, res, next) => {
  try {
    await pool.execute("DELETE FROM site_content_drafts WHERE site_key = ? AND updated_by = ?", [siteKey, req.user.id]);
    await writeAuditLog({ req, userId: req.user.id, action: "content.draft_deleted", entityType: "content", entityId: siteKey });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

app.post("/api/content/publish", requireUser, requireCsrf, requireRole("admin"), async (req, res, next) => {
  try {
    validateContentPayload(req.body?.content);
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
      await connection.execute(
        "INSERT INTO site_content_revisions (site_key, version, content, published_by) VALUES (?, ?, ?, ?)",
        [siteKey, nextVersion, JSON.stringify(req.body.content), req.user.id],
      );
      await writeAuditLog({
        req,
        userId: req.user.id,
        action: "content.published",
        entityType: "content",
        entityId: siteKey,
        details: { version: nextVersion },
      }, connection);
      return { content: req.body.content, version: nextVersion };
    });
    contentCache.storeContent(result.content, result.version);
    return res.json({ data: result });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/content/revisions", requireUser, requireRole("admin"), async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
    const [rows] = await pool.query(
      `SELECT r.version, r.created_at, r.published_by, u.display_name, u.email
       FROM site_content_revisions r
       LEFT JOIN users u ON u.id = r.published_by
       WHERE r.site_key = ?
       ORDER BY r.version DESC
       LIMIT ${limit}`,
      [siteKey],
    );
    return res.json({ data: rows });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/content/revisions/:version", requireUser, requireRole("admin"), async (req, res, next) => {
  try {
    const version = Number(req.params.version);
    if (!Number.isSafeInteger(version) || version < 1) return res.status(400).json({ error: "Phiên bản không hợp lệ." });
    const [rows] = await pool.execute(
      "SELECT version, content, created_at, published_by FROM site_content_revisions WHERE site_key = ? AND version = ? LIMIT 1",
      [siteKey, version],
    );
    if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy phiên bản nội dung." });
    const revision = rows[0];
    return res.json({ data: { ...revision, content: typeof revision.content === "string" ? JSON.parse(revision.content) : revision.content } });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/content/revisions/:version/restore", requireUser, requireCsrf, requireRole("admin"), async (req, res, next) => {
  try {
    const version = Number(req.params.version);
    if (!Number.isSafeInteger(version) || version < 1) return res.status(400).json({ error: "Phiên bản không hợp lệ." });
    const [passwordRows] = await pool.execute("SELECT password_hash FROM users WHERE id = ? LIMIT 1", [req.user.id]);
    if (!passwordRows[0] || !(await bcrypt.compare(String(req.body?.currentPassword || ""), passwordRows[0].password_hash))) {
      return res.status(401).json({ error: "Mật khẩu hiện tại không chính xác." });
    }
    const result = await withTransaction(async (connection) => {
      const [revisionRows] = await connection.execute(
        "SELECT content FROM site_content_revisions WHERE site_key = ? AND version = ? LIMIT 1 FOR UPDATE",
        [siteKey, version],
      );
      if (!revisionRows[0]) {
        const error = new Error("Không tìm thấy phiên bản nội dung.");
        error.statusCode = 404;
        throw error;
      }
      const content = typeof revisionRows[0].content === "string" ? JSON.parse(revisionRows[0].content) : revisionRows[0].content;
      validateContentPayload(content);
      const [currentRows] = await connection.execute("SELECT version FROM site_content WHERE site_key = ? FOR UPDATE", [siteKey]);
      const nextVersion = Number(currentRows[0]?.version || 0) + 1;
      await connection.execute(
        `INSERT INTO site_content (site_key, content, version, updated_by) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE content = VALUES(content), version = VALUES(version), updated_by = VALUES(updated_by)`,
        [siteKey, JSON.stringify(content), nextVersion, req.user.id],
      );
      await connection.execute(
        "INSERT INTO site_content_revisions (site_key, version, content, published_by) VALUES (?, ?, ?, ?)",
        [siteKey, nextVersion, JSON.stringify(content), req.user.id],
      );
      await writeAuditLog({
        req,
        userId: req.user.id,
        action: "content.restored",
        entityType: "content",
        entityId: siteKey,
        details: { restoredFromVersion: version, version: nextVersion },
      }, connection);
      return { content, version: nextVersion };
    });
    contentCache.storeContent(result.content, result.version);
    return res.json({ data: result });
  } catch (error) {
    return next(error);
  }
});

app.use("/api/media", mediaRouter);

app.post("/api/submissions", async (req, res, next) => {
  try {
    await consumeIpLimit(req, "submission-create", 10);
    const { name, age, school, imageAssetId, altImageAssetId = null } = req.body || {};
    if (!name || !age || !school || !imageAssetId) return res.status(400).json({ error: "Thiếu thông tin đăng ký hoặc ảnh." });
    const normalizedName = String(name).trim().slice(0, 80);
    const normalizedAge = String(age).trim().slice(0, 30);
    const normalizedSchool = String(school).trim().slice(0, 120);
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!normalizedName || !isValidYouthBirthYear(normalizedAge) || !isYouthSchoolOption(normalizedSchool) || !uuidPattern.test(String(imageAssetId)) || (altImageAssetId && !uuidPattern.test(String(altImageAssetId)))) {
      return res.status(400).json({ error: "Thông tin đăng ký không hợp lệ." });
    }
    const assetIds = altImageAssetId ? [imageAssetId, altImageAssetId] : [imageAssetId];
    const placeholders = assetIds.map(() => "?").join(", ");
    const [assetRows] = await pool.query(
      `SELECT id FROM media_assets WHERE id IN (${placeholders}) AND uploaded_by IS NULL AND deleted_at IS NULL`,
      assetIds,
    );
    if (assetRows.length !== assetIds.length) return res.status(400).json({ error: "Ảnh đăng ký không hợp lệ hoặc không còn tồn tại." });
    const [result] = await pool.execute(
      "INSERT INTO submissions (name, age, school, image_asset_id, alt_image_asset_id) VALUES (?, ?, ?, ?, ?)",
      [normalizedName, normalizedAge, normalizedSchool, imageAssetId, altImageAssetId],
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

app.post("/api/submissions/:id/reject", requireUser, requireCsrf, requireRole("admin", "editor"), async (req, res, next) => {
  try {
    const [result] = await pool.execute("UPDATE submissions SET status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, review_note = ? WHERE id = ? AND status = 'pending'", [req.user.id, String(req.body?.reviewNote || "").slice(0, 1000), req.params.id]);
    if (!result.affectedRows) return res.status(409).json({ error: "Yêu cầu này đã được xử lý trước đó." });
    await writeAuditLog({ req, userId: req.user.id, action: "submission.rejected", entityType: "submission", entityId: req.params.id });
    return res.json({ data: { id: req.params.id, status: "rejected" } });
  } catch (error) { return next(error); }
});

app.post("/api/submissions/:id/approve", requireUser, requireCsrf, requireRole("admin"), async (req, res, next) => {
  try {
    const submissionId = Number(req.params.id);
    if (!Number.isSafeInteger(submissionId) || submissionId < 1) return res.status(400).json({ error: "Mã đăng ký không hợp lệ." });
    const result = await withTransaction(async (connection) => {
      const [submissionRows] = await connection.execute(
        `SELECT s.id, s.name, s.age, s.school, s.status, s.image_asset_id, s.alt_image_asset_id,
                m.storage_provider AS image_provider, m.storage_path,
                am.storage_provider AS alt_image_provider, am.storage_path AS alt_storage_path
         FROM submissions s
         JOIN media_assets m ON m.id = s.image_asset_id AND m.deleted_at IS NULL
         LEFT JOIN media_assets am ON am.id = s.alt_image_asset_id AND am.deleted_at IS NULL
         WHERE s.id = ? FOR UPDATE`,
        [submissionId],
      );
      const submission = submissionRows[0];
      if (!submission) {
        const error = new Error("Không tìm thấy yêu cầu đăng ký hoặc ảnh đã bị xóa.");
        error.statusCode = 404;
        throw error;
      }
      if (submission.status !== "pending") {
        const error = new Error("Yêu cầu này đã được xử lý trước đó.");
        error.statusCode = 409;
        throw error;
      }
      submission.image_src = submission.image_provider === "imagekit"
        ? submission.storage_path
        : `${publicApiBaseUrl}/api/media/${submission.image_asset_id}`;
      submission.alt_image_src = submission.alt_image_asset_id && submission.alt_image_provider
        ? (submission.alt_image_provider === "imagekit" ? submission.alt_storage_path : `${publicApiBaseUrl}/api/media/${submission.alt_image_asset_id}`)
        : "";
      if (!submission.alt_image_src) submission.alt_image_asset_id = null;

      const [contentRows] = await connection.execute("SELECT content, version FROM site_content WHERE site_key = ? FOR UPDATE", [siteKey]);
      if (!contentRows[0]) {
        const error = new Error("Nội dung trang chủ chưa được khởi tạo.");
        error.statusCode = 409;
        throw error;
      }
      const currentContent = typeof contentRows[0].content === "string" ? JSON.parse(contentRows[0].content) : contentRows[0].content;
      const card = buildApprovedSubmissionCard(submission);
      const nextContent = appendApprovedSubmissionCard(currentContent, card);
      validateContentPayload(nextContent);
      const nextVersion = Number(contentRows[0].version || 0) + 1;

      await connection.execute(
        "UPDATE site_content SET content = ?, version = ?, updated_by = ? WHERE site_key = ?",
        [JSON.stringify(nextContent), nextVersion, req.user.id, siteKey],
      );
      await connection.execute(
        "INSERT INTO site_content_revisions (site_key, version, content, published_by) VALUES (?, ?, ?, ?)",
        [siteKey, nextVersion, JSON.stringify(nextContent), req.user.id],
      );
      await connection.execute(
        "UPDATE submissions SET status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, approved_card = ? WHERE id = ? AND status = 'pending'",
        [req.user.id, JSON.stringify(card), submissionId],
      );
      await writeAuditLog({
        req,
        userId: req.user.id,
        action: "submission.approved",
        entityType: "submission",
        entityId: submissionId,
        details: { cardId: card.id, contentVersion: nextVersion },
      }, connection);
      return { id: submissionId, status: "approved", card, content: nextContent, version: nextVersion };
    });
    contentCache.storeContent(result.content, result.version);
    return res.json({ data: result });
  } catch (error) { return next(error); }
});

app.get("/api/admin/audit", requireUser, requireRole("admin"), async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const [rows] = await pool.query(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.details, a.created_at,
              u.display_name, u.email
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC
       LIMIT ${limit}`,
    );
    return res.json({ data: rows });
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (error.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "Ảnh vượt quá dung lượng cho phép." });
  const status = error.statusCode || 500;
  if (status >= 500 && !error.expose) console.error(error);
  return res.status(status).json({ error: status >= 500 && !error.expose ? "Máy chủ đang gặp sự cố. Hãy thử lại sau." : (error.message || "Yêu cầu không hợp lệ.") });
});

app.listen(port, () => {
  console.log(`Thôn API listening on http://localhost:${port}`);
  pool.query("SELECT 1").catch((error) => {
    console.warn(`MySQL chưa kết nối: ${error.message}`);
  });
  pool.query("DELETE FROM auth_rate_limits WHERE expires_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY)").catch(() => {});
  pool.query("DELETE FROM auth_challenges WHERE expires_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 7 DAY)").catch(() => {});
});
