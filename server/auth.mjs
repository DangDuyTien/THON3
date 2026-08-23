import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { pool } from "./db.mjs";

const SESSION_COOKIE = "thon_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const SESSION_SECRET = process.env.SESSION_SECRET || "development-only-change-me";
const crossSiteCookies = process.env.CROSS_SITE_COOKIES === "true";
const cookieOptions = {
  httpOnly: true,
  sameSite: crossSiteCookies ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export const ADMIN_PASSWORD_PATTERN = /^\d{12,18}$/;

export function validateAdminPassword(value) {
  const password = String(value || "");
  if (!ADMIN_PASSWORD_PATTERN.test(password)) {
    const error = new Error("Mật khẩu quản trị phải gồm 12 đến 18 chữ số.");
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
  return jwt.sign({ sub: String(user.id), role: user.role, email: user.email }, SESSION_SECRET, { expiresIn: SESSION_TTL_SECONDS });
}

export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    ...cookieOptions,
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
}

export async function requireUser(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return res.status(401).json({ error: "Bạn chưa đăng nhập." });
  try {
    const payload = jwt.verify(token, SESSION_SECRET);
    const [rows] = await pool.execute("SELECT id, email, display_name, role, disabled_at FROM users WHERE id = ? LIMIT 1", [payload.sub]);
    const user = rows[0];
    if (!user || user.disabled_at) return res.status(401).json({ error: "Phiên đăng nhập không còn hợp lệ." });
    req.user = user;
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

export { SESSION_COOKIE };
