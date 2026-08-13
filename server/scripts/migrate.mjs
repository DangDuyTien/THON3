import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import "dotenv/config";
import { pool } from "../db.mjs";

const migrationsDir = path.resolve("server/migrations");
const migrationFiles = (await fs.readdir(migrationsDir))
  .filter((file) => /^\d+_.+\.sql$/.test(file))
  .sort();

await pool.query(
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    filename VARCHAR(255) NOT NULL PRIMARY KEY,
    checksum CHAR(64) NOT NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
);

for (const filename of migrationFiles) {
  const sql = await fs.readFile(path.join(migrationsDir, filename), "utf8");
  const checksum = crypto.createHash("sha256").update(sql).digest("hex");
  const [applied] = await pool.execute("SELECT checksum FROM schema_migrations WHERE filename = ? LIMIT 1", [filename]);
  if (applied[0]) {
    if (applied[0].checksum !== checksum) throw new Error(`Migration đã áp dụng bị thay đổi: ${filename}`);
    continue;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const statement of sql.split(";").map((part) => part.trim()).filter(Boolean)) await connection.query(statement);
    await connection.execute("INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)", [filename, checksum]);
    await connection.commit();
    console.log(`Applied migration: ${filename}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

await pool.end();
console.log("MySQL migration completed.");
