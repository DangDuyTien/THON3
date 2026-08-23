import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { pool } from "./db.mjs";

const SESSION_COOKIE = "thon_session";
const LEGACY_SESSION_COOKIE = "thon_session";
const SESSION_SECRET = String(process.env.SESSION_SECRET || "");
const configuredSessionHours = Number(process.env.SESSION_TTL_HOURS || 12);
const sessionHours = Number.isFinite(configuredSessionHours) && configuredSessionHours >= 1 && configuredSessionHours <= 24 ? configuredSessionHours : 12;
const SESSION_TTL_SECONDS = Math.round(sessionHours * 60 * 60);
const SESSION_ISSUER = "thon3-api";
const SESSION_AUDIENCE = "thon3-admin";
const isProduction = process.env.NODE_ENV === "production";
const crossSiteCookies = process.env.CROSS_SITE_COOKIES === "true";
const sessionCookieName = isProduction ? "__Host-thon_session" : SESSION_COOKIE;

if (isProduction && SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET phải có ít nhất 32 ký tự ngẫu nhiên trên production.");
}

const effectiveSessionSecret = SESSION_SECRET || crypto.randomBytes(48).toString("hex");
const cookieOptions = {
  httpOnly: true,
  sameSite: crossSiteCookies ? "none" : "lax",
  secure: isProduction,
  path: "/",
};

export const ADMIN_PASSWORD_PATTERN = /^\d{16,18}$/;

export function validateAdminPassword(value) {
  const password = String(value || "");
  if (!ADMIN_PASSWORD_PATTERN.test(password)) {
    const error = new Error("Mật khẩu quản trị phải gồm 16 đến 18 chữ số.");
    error.statusCode = 400;
    throw error;
  }
  return password;
}

export function safeCompare(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function issueSession(user) {
  return jwt.sign(
    { sub: String(user.id), ver: Number(user.session_version || 1) },
    effectiveSessionSecret,
    { algorithm: "HS256", audience: SESSION_AUDIENCE, expiresIn: SESSION_TTL_SECONDS, issuer: SESSION_ISSUER },
  );
}

export function setSessionCookie(res, token) {
  if (isProduction) res.clearCookie(LEGACY_SESSION_COOKIE, cookieOptions);
  res.cookie(sessionCookieName, token, {
    ...cookieOptions,
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(sessionCookieName, cookieOptions);
  if (sessionCookieName !== LEGACY_SESSION_COOKIE) res.clearCookie(LEGACY_SESSION_COOKIE, cookieOptions);
}

export function issueCsrfToken(token) {
  return crypto.createHmac("sha256", effectiveSessionSecret).update(`csrf:${token}`).digest("hex");
}

export function requireCsrf(req, res, next) {
  const token = req.cookies?.[sessionCookieName];
  const received = String(req.get("X-CSRF-Token") || "");
  if (!token || !safeCompare(received, issueCsrfToken(token))) {
    return res.status(403).json({ error: "Yêu cầu bảo mật không hợp lệ. Hãy tải lại trang admin." });
  }
  return next();
}

export async function requireUser(req, res, next) {
  const token = req.cookies?.[sessionCookieName];
  if (!token) return res.status(401).json({ error: "Bạn chưa đăng nhập." });
  try {
    const payload = jwt.verify(token, effectiveSessionSecret, {
      algorithms: ["HS256"],
      audience: SESSION_AUDIENCE,
      issuer: SESSION_ISSUER,
    });
    const [rows] = await pool.execute("SELECT id, email, display_name, role, session_version, email_otp_enabled, last_login_at, disabled_at FROM users WHERE id = ? LIMIT 1", [payload.sub]);
    const user = rows[0];
    if (!user || user.disabled_at || Number(payload.ver) !== Number(user.session_version)) {
      clearSessionCookie(res);
      return res.status(401).json({ error: "Phiên đăng nhập không còn hợp lệ." });
    }
    req.user = user;
    req.sessionToken = token;
    return next();
  } catch {
    return res.status(401).json({ error: "Phiên đăng nhập không còn hợp lệ." });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: "Tài khoản không có quyền thực hiện thao tác này." });
    return next();
  };
}

export function hashToken(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export { SESSION_TTL_SECONDS, sessionCookieName as SESSION_COOKIE };
