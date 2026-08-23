import crypto from "node:crypto";
import { pool, withTransaction } from "./db.mjs";

const SECURITY_SECRET = String(process.env.SECURITY_HASH_SECRET || process.env.SESSION_SECRET || crypto.randomBytes(48).toString("hex"));
const RESEND_API_KEY = String(process.env.RESEND_API_KEY || "").trim();
const SECURITY_EMAIL_FROM = String(process.env.SECURITY_EMAIL_FROM || "").trim();
const EMAIL_OTP_REQUIRED = process.env.ADMIN_EMAIL_OTP_REQUIRED === "true";
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const AUTH_WINDOW_MS = 15 * 60 * 1000;

if (process.env.NODE_ENV === "production" && EMAIL_OTP_REQUIRED && (!RESEND_API_KEY || !SECURITY_EMAIL_FROM)) {
  throw new Error("Cần RESEND_API_KEY và SECURITY_EMAIL_FROM khi ADMIN_EMAIL_OTP_REQUIRED=true.");
}

function keyedHash(value) {
  return crypto.createHmac("sha256", SECURITY_SECRET).update(String(value || "")).digest("hex");
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase().slice(0, 255);
}

export function getRequestIp(req) {
  return String(req.ip || req.socket?.remoteAddress || "unknown");
}

export function getRequestIpHash(req) {
  return keyedHash(`ip:${getRequestIp(req)}`);
}

export function maskEmail(email) {
  const [local = "", domain = ""] = normalizeEmail(email).split("@");
  if (!local || !domain) return "email quản trị";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

function authIdentifiers(req, email) {
  return [
    keyedHash(`ip:${getRequestIp(req)}`),
    keyedHash(`email:${normalizeEmail(email)}`),
  ];
}

export async function assertAuthAllowed(req, email, kind, maxFailures = 8) {
  const identifiers = authIdentifiers(req, email);
  const [rows] = await pool.query(
    `SELECT failures, expires_at FROM auth_rate_limits
     WHERE kind = ? AND identifier_hash IN (?, ?) AND expires_at > CURRENT_TIMESTAMP`,
    [kind, ...identifiers],
  );
  if (rows.some((row) => Number(row.failures) >= maxFailures)) {
    const error = new Error("Bạn đã thử quá nhiều lần. Hãy đợi 15 phút rồi thử lại.");
    error.statusCode = 429;
    throw error;
  }
}

export async function recordAuthFailure(req, email, kind) {
  const expiresAt = new Date(Date.now() + AUTH_WINDOW_MS);
  await Promise.all(authIdentifiers(req, email).map((identifierHash) => pool.execute(
    `INSERT INTO auth_rate_limits (kind, identifier_hash, failures, expires_at)
     VALUES (?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE
       failures = IF(expires_at <= CURRENT_TIMESTAMP, 1, failures + 1),
       expires_at = IF(expires_at <= CURRENT_TIMESTAMP, VALUES(expires_at), expires_at)`,
    [kind, identifierHash, expiresAt],
  )));
}

export async function clearAuthFailures(req, email, kind) {
  const identifiers = authIdentifiers(req, email);
  await pool.query(
    "DELETE FROM auth_rate_limits WHERE kind = ? AND identifier_hash IN (?, ?)",
    [kind, ...identifiers],
  );
}

export async function consumeIpLimit(req, kind, maxAttempts = 20) {
  const identifierHash = keyedHash(`ip:${getRequestIp(req)}`);
  const [rows] = await pool.execute(
    "SELECT failures, expires_at FROM auth_rate_limits WHERE kind = ? AND identifier_hash = ? AND expires_at > CURRENT_TIMESTAMP LIMIT 1",
    [kind, identifierHash],
  );
  if (rows[0] && Number(rows[0].failures) >= maxAttempts) {
    const error = new Error("Bạn đã gửi quá nhiều yêu cầu. Hãy thử lại sau 15 phút.");
    error.statusCode = 429;
    throw error;
  }
  const expiresAt = new Date(Date.now() + AUTH_WINDOW_MS);
  await pool.execute(
    `INSERT INTO auth_rate_limits (kind, identifier_hash, failures, expires_at)
     VALUES (?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE
       failures = IF(expires_at <= CURRENT_TIMESTAMP, 1, failures + 1),
       expires_at = IF(expires_at <= CURRENT_TIMESTAMP, VALUES(expires_at), expires_at)`,
    [kind, identifierHash, expiresAt],
  );
}

export function isEmailDeliveryConfigured() {
  return Boolean(RESEND_API_KEY && SECURITY_EMAIL_FROM);
}

export function isEmailOtpRequired() {
  return EMAIL_OTP_REQUIRED;
}

export function requireEmailDelivery() {
  if (isEmailDeliveryConfigured()) return;
  const error = new Error("Khôi phục qua email chưa được cấu hình trên máy chủ.");
  error.statusCode = 503;
  error.expose = true;
  throw error;
}

async function sendEmail({ to, subject, text }) {
  requireEmailDelivery();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: SECURITY_EMAIL_FROM, to: [to], subject, text }),
  });
  if (response.ok) return;
  const error = new Error("Máy chủ email chưa gửi được mã bảo mật.");
  error.statusCode = 502;
  error.expose = true;
  throw error;
}

function challengeCodeHash({ challengeId, email, purpose, code }) {
  return keyedHash(`otp:${challengeId}:${normalizeEmail(email)}:${purpose}:${String(code || "")}`);
}

function generateOtp() {
  return String(crypto.randomInt(0, 100_000_000)).padStart(8, "0");
}

export async function createEmailChallenge({ req, user = null, email, purpose }) {
  const normalizedEmail = normalizeEmail(email);
  const challengeId = crypto.randomUUID();
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  await pool.execute(
    "UPDATE auth_challenges SET consumed_at = CURRENT_TIMESTAMP WHERE email = ? AND purpose = ? AND consumed_at IS NULL",
    [normalizedEmail, purpose],
  );
  await pool.execute(
    `INSERT INTO auth_challenges
      (id, user_id, email, purpose, code_hash, max_attempts, expires_at, request_ip_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [challengeId, user?.id || null, normalizedEmail, purpose, challengeCodeHash({ challengeId, email: normalizedEmail, purpose, code }), OTP_MAX_ATTEMPTS, expiresAt, getRequestIpHash(req)],
  );

  if (!user) return { challengeId, expiresInSeconds: OTP_TTL_MINUTES * 60 };
  try {
    const subject = purpose === "login" ? "Mã xác thực đăng nhập quản trị THÔN 3" : purpose === "mfa" ? "Mã bật xác thực hai bước THÔN 3" : "Mã khôi phục mật khẩu quản trị THÔN 3";
    const action = purpose === "login" ? "đăng nhập" : purpose === "mfa" ? "bật xác thực hai bước" : "khôi phục mật khẩu";
    await sendEmail({
      to: normalizedEmail,
      subject,
      text: `Mã ${action} của bạn là: ${code}\n\nMã có hiệu lực trong ${OTP_TTL_MINUTES} phút và chỉ dùng được một lần. Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.`,
    });
  } catch (error) {
    await pool.execute("DELETE FROM auth_challenges WHERE id = ?", [challengeId]);
    throw error;
  }
  return { challengeId, expiresInSeconds: OTP_TTL_MINUTES * 60 };
}

export async function verifyEmailChallenge({ req, challengeId, email, purpose, code }) {
  const normalizedEmail = normalizeEmail(email);
  await assertAuthAllowed(req, normalizedEmail, `${purpose}-otp`, OTP_MAX_ATTEMPTS);
  try {
    const user = await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        `SELECT c.*, u.id AS account_id, u.email AS account_email, u.display_name, u.role,
                u.session_version, u.email_otp_enabled, u.disabled_at
         FROM auth_challenges c
         LEFT JOIN users u ON u.id = c.user_id
         WHERE c.id = ? AND c.email = ? AND c.purpose = ?
         LIMIT 1 FOR UPDATE`,
        [String(challengeId || ""), normalizedEmail, purpose],
      );
      const challenge = rows[0];
      const expired = !challenge || challenge.consumed_at || new Date(challenge.expires_at).getTime() <= Date.now();
      const blocked = challenge && Number(challenge.attempts) >= Number(challenge.max_attempts);
      const matches = challenge && crypto.timingSafeEqual(
        Buffer.from(challenge.code_hash),
        Buffer.from(challengeCodeHash({ challengeId, email: normalizedEmail, purpose, code })),
      );
      if (expired || blocked || !matches || !challenge.account_id || challenge.disabled_at) {
        if (challenge && !challenge.consumed_at && !expired) {
          await connection.execute("UPDATE auth_challenges SET attempts = attempts + 1 WHERE id = ?", [challenge.id]);
        }
        const error = new Error("Mã xác thực không chính xác hoặc đã hết hạn.");
        error.statusCode = 401;
        throw error;
      }
      await connection.execute("UPDATE auth_challenges SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?", [challenge.id]);
      return {
        id: challenge.account_id,
        email: challenge.account_email,
        display_name: challenge.display_name,
        role: challenge.role,
        session_version: challenge.session_version,
        email_otp_enabled: challenge.email_otp_enabled,
      };
    });
    await clearAuthFailures(req, normalizedEmail, `${purpose}-otp`);
    return user;
  } catch (error) {
    if (error.statusCode === 401) await recordAuthFailure(req, normalizedEmail, `${purpose}-otp`);
    throw error;
  }
}

export async function sendLoginAlert({ user, req }) {
  if (!isEmailDeliveryConfigured() || EMAIL_OTP_REQUIRED) return;
  await sendEmail({
    to: user.email,
    subject: "Cảnh báo đăng nhập quản trị THÔN 3",
    text: `Tài khoản quản trị vừa đăng nhập lúc ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}.\nĐịa chỉ truy cập đã được ghi nhận ở dạng băm trong nhật ký bảo mật. Nếu không phải bạn, hãy đổi mật khẩu ngay.`,
  });
}

export async function writeAuditLog({ req, userId = null, action, entityType, entityId = null, details = null }, executor = pool) {
  await executor.execute(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_hash, details)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, action, entityType, entityId == null ? null : String(entityId), req ? getRequestIpHash(req) : null, details == null ? null : JSON.stringify(details)],
  );
}

export function validateContentPayload(content) {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    const error = new Error("Nội dung không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }
  const serialized = JSON.stringify(content);
  if (Buffer.byteLength(serialized, "utf8") > 2 * 1024 * 1024) {
    const error = new Error("Nội dung vượt quá dung lượng cho phép.");
    error.statusCode = 413;
    throw error;
  }
  let nodes = 0;
  const visit = (value, key = "", depth = 0) => {
    nodes += 1;
    if (depth > 24 || nodes > 25_000) throw new Error("Cấu trúc nội dung quá phức tạp.");
    if (typeof value === "string" && /(href|url|src|image|logo)/i.test(key)) {
      const normalized = value.trim().toLowerCase();
      if (/^(javascript|vbscript):/.test(normalized) || (normalized.startsWith("data:") && !/^data:image\/(jpeg|png|webp|avif);base64,/.test(normalized))) {
        throw new Error("Nội dung chứa đường dẫn không an toàn.");
      }
    }
    if (Array.isArray(value)) return value.forEach((item) => visit(item, key, depth + 1));
    if (!value || typeof value !== "object") return;
    for (const [childKey, childValue] of Object.entries(value)) {
      if (["__proto__", "prototype", "constructor"].includes(childKey)) throw new Error("Nội dung chứa trường không an toàn.");
      visit(childValue, childKey, depth + 1);
    }
  };
  try {
    visit(content);
  } catch (error) {
    error.statusCode = error.statusCode || 400;
    throw error;
  }
  return content;
}

export function getPublicSecurityConfig(user) {
  return {
    emailOtpEnabled: EMAIL_OTP_REQUIRED || Boolean(user.email_otp_enabled),
    emailOtpRequiredByServer: EMAIL_OTP_REQUIRED,
    emailDeliveryConfigured: isEmailDeliveryConfigured(),
    maskedEmail: maskEmail(user.email),
    otpExpiresInMinutes: OTP_TTL_MINUTES,
  };
}
