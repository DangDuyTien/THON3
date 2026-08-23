import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { pool } from "../db.mjs";
import { validateAdminPassword } from "../auth.mjs";

const email = String(process.env.ADMIN_NEW_EMAIL || "").trim().toLowerCase();
const displayName = String(process.env.ADMIN_NEW_DISPLAY_NAME || "Quản trị viên").trim();
const generatedPassword = process.env.ADMIN_NEW_PASSWORD || Array.from({ length: 14 }, () => crypto.randomInt(0, 10)).join("");

if (!email || !email.includes("@")) throw new Error("Cần ADMIN_NEW_EMAIL là một địa chỉ email hợp lệ.");
const password = validateAdminPassword(generatedPassword);
const hash = await bcrypt.hash(password, 12);
const [result] = await pool.execute(
  `INSERT INTO users (email, password_hash, display_name, role)
   VALUES (?, ?, ?, 'admin')`,
  [email, hash, displayName || "Quản trị viên"],
);
await pool.end();
console.log(`Đã tạo admin: ${email}`);
console.log(`Mật khẩu số: ${password}`);
console.log(`ID: ${result.insertId}`);
