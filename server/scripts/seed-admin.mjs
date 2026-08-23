import bcrypt from "bcryptjs";
import "dotenv/config";
import { pool } from "../db.mjs";
import { validateAdminPassword } from "../auth.mjs";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) throw new Error("Cần ADMIN_EMAIL và ADMIN_PASSWORD để seed admin.");
const hash = await bcrypt.hash(validateAdminPassword(password), 12);
await pool.execute(
  `INSERT INTO users (email, password_hash, display_name, role)
   VALUES (?, ?, ?, 'admin')
   ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin', disabled_at = NULL`,
  [email.trim().toLowerCase(), hash, process.env.ADMIN_DISPLAY_NAME || "Quản trị viên"],
);
await pool.end();
console.log(`Admin seeded: ${email}`);
